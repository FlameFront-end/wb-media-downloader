import { InvalidSegmentError, UnsupportedPlaylistError } from './errors'
import { numberMp4Fragments, setMp4Duration } from './mp4-headers'

/** The part of mux.js `mp4.Transmuxer` used here (mux.js ships no type definitions). */
interface TransmuxedSegment {
	initSegment: Uint8Array<ArrayBuffer>
	data: Uint8Array<ArrayBuffer>
}

type TimingEvent = 'videoSegmentTimingInfo' | 'audioSegmentTimingInfo'
interface SegmentTiming {
	start: { dts: number }
}

interface MuxTransmuxer {
	on(event: 'data', listener: (segment: TransmuxedSegment) => void): void
	on(event: TimingEvent, listener: (timing: SegmentTiming) => void): void
	push: (bytes: Uint8Array) => void
	flush: () => void
	dispose: () => void
}

interface MuxTransmuxerModule {
	Transmuxer: new (options?: { remux?: boolean }) => MuxTransmuxer
}

async function loadMuxTransmuxer(): Promise<MuxTransmuxerModule> {
	// Only the MP4 transmuxer, not the whole mux.js (FLV, captions, inspectors).
	// @ts-expect-error -- mux.js has no type definitions; the used API is typed above
	const module = (await import('mux.js/lib/mp4/transmuxer.js')) as { default: MuxTransmuxerModule }

	return module.default
}

const TS_PACKET_SIZE = 188
const TS_SYNC_BYTE = 0x47

export interface Mp4Transmuxer {
	/**
	 * Remuxes one MPEG-TS segment; push segments in playlist order.
	 * Throws `InvalidSegmentError` if the segment is not MPEG-TS or yields no media,
	 * so a broken segment can't silently produce a truncated file.
	 */
	push: (segment: Uint8Array) => void
	/** Returns the fragmented MP4 file. */
	finish: (durationSeconds: number) => Blob
	/** Releases mux.js listeners; call once done, whether `finish` succeeded or not. */
	dispose: () => void
}

/**
 * MPEG-TS → fragmented MP4 without re-encoding.
 * mux.js is loaded on demand: it is only needed when the user downloads a video.
 */
export async function createMp4Transmuxer(): Promise<Mp4Transmuxer> {
	const { Transmuxer } = await loadMuxTransmuxer()
	const transmuxer = new Transmuxer({ remux: true })

	let initSegment: Uint8Array<ArrayBuffer> | null = null
	const fragments: Uint8Array<ArrayBuffer>[] = []
	let nonIncreasingTime = false
	let fragmentSequence = 1

	const timingEvents: TimingEvent[] = ['videoSegmentTimingInfo', 'audioSegmentTimingInfo']
	for (const event of timingEvents) {
		let previousStart: number | undefined
		transmuxer.on(event, ({ start }) => {
			if (previousStart !== undefined && start.dts <= previousStart) {
				nonIncreasingTime = true
			}
			previousStart = start.dts
		})
	}

	transmuxer.on('data', segment => {
		initSegment ??= segment.initSegment
		fragmentSequence = numberMp4Fragments(segment.data, fragmentSequence)
		fragments.push(segment.data)
	})

	return {
		push(segment) {
			if (segment.byteLength < TS_PACKET_SIZE || segment[0] !== TS_SYNC_BYTE) {
				throw new InvalidSegmentError('Segment is not MPEG-TS')
			}

			const fragmentsBefore = fragments.length
			transmuxer.push(segment)
			// Flush per segment: each source segment can be garbage-collected right away
			transmuxer.flush()

			// A CDN can repeat a TS segment even when the playlist has no discontinuity tag.
			if (nonIncreasingTime) {
				throw new UnsupportedPlaylistError('Segment decode times do not advance')
			}

			if (fragments.length === fragmentsBefore) {
				throw new InvalidSegmentError('Segment contains no playable media')
			}
		},
		finish(durationSeconds) {
			if (!initSegment || fragments.length === 0) {
				throw new UnsupportedPlaylistError('Segments contain no playable media')
			}

			return new Blob([setMp4Duration(initSegment, durationSeconds), ...fragments], { type: 'video/mp4' })
		},
		dispose() {
			transmuxer.dispose()
			fragments.length = 0
		}
	}
}
