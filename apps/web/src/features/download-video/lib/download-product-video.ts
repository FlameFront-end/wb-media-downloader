import type { ProductVideo, ProductVideoSource } from '@/entities/product'
import { fetchBytes, fetchText, HttpError, isRetryableError, type VideoQuality } from '@/shared/api'
import { createMp4Transmuxer, parseMediaPlaylist, type DownloadTaskContext, type MediaPlaylist } from '@/shared/lib'

export class VideoUnavailableError extends Error {
	override readonly name = 'VideoUnavailableError'
}

interface DownloadVideoOptions {
	signal?: AbortSignal
	onProgress?: DownloadTaskContext['onProgress']
}

const IDLE_TIMEOUT_MS = 12_000
const PROGRESS_STEP_BYTES = 64 * 1024

export function videoRequestTimedOut(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'TimeoutError'
}

async function fetchSegment(
	url: string,
	signal: AbortSignal | undefined,
	onBytes: (received: number) => void
): Promise<Uint8Array<ArrayBuffer>> {
	for (let attempt = 0; ; attempt++) {
		signal?.throwIfAborted()
		const idle = new AbortController()
		const requestSignal = signal ? AbortSignal.any([signal, idle.signal]) : idle.signal
		let timer: ReturnType<typeof setTimeout>
		const armTimeout = () =>
			setTimeout(() => {
				idle.abort(new DOMException('The video segment stopped transferring', 'TimeoutError'))
			}, IDLE_TIMEOUT_MS)

		timer = armTimeout()
		let reported = 0
		try {
			if (attempt > 0) {
				onBytes(0)
			}
			return await fetchBytes(url, {
				signal: requestSignal,
				onBytes(received) {
					clearTimeout(timer)
					timer = armTimeout()
					if (received - reported >= PROGRESS_STEP_BYTES) {
						reported = received
						onBytes(received)
					}
				}
			})
		} catch (error) {
			signal?.throwIfAborted()
			if (attempt > 0 || (!idle.signal.aborted && !isRetryableError(error))) {
				idle.signal.throwIfAborted()
				throw error
			}
		} finally {
			clearTimeout(timer)
		}
	}
}

interface DownloadedVideo {
	quality: VideoQuality
	file: Blob
}

/** Picks the best quality the CDN actually has: a missing playlist (404) falls back to the next one. */
async function resolvePlaylist(
	sources: readonly ProductVideoSource[],
	signal?: AbortSignal
): Promise<{ quality: VideoQuality; playlist: MediaPlaylist }> {
	for (const source of sources) {
		let text: string
		const timeout = AbortSignal.timeout(IDLE_TIMEOUT_MS)

		try {
			text = await fetchText(source.playlistUrl, {
				signal: signal ? AbortSignal.any([signal, timeout]) : timeout
			})
		} catch (error) {
			signal?.throwIfAborted()
			timeout.throwIfAborted()
			if (error instanceof HttpError && error.status === 404) {
				continue
			}

			throw error
		}

		return { quality: source.quality, playlist: parseMediaPlaylist(text, source.playlistUrl) }
	}

	throw new VideoUnavailableError('No video playlist is available on CDN')
}

/**
 * HLS → MP4 in the browser: segments are downloaded one by one and remuxed
 * right away, so only one source segment is held in memory at a time.
 * Every segment must yield media (`InvalidSegmentError` otherwise): a file is
 * saved only when the whole playlist was remuxed.
 */
export async function downloadProductVideo(
	video: ProductVideo,
	{ signal, onProgress }: DownloadVideoOptions = {}
): Promise<DownloadedVideo> {
	signal?.throwIfAborted()

	// Playlist first: when there is no video, no transmuxer is created at all
	const { quality, playlist } = await resolvePlaylist(video.sources, signal)
	const total = playlist.segments.length
	const transmuxer = await createMp4Transmuxer()

	try {
		onProgress?.(0, total)

		for (const [index, segment] of playlist.segments.entries()) {
			const bytes = await fetchSegment(segment.url, signal, received => {
				onProgress?.(index, total, received)
			})
			transmuxer.push(bytes)
			onProgress?.(index + 1, total)
		}

		signal?.throwIfAborted()

		return { quality, file: transmuxer.finish(playlist.durationSeconds) }
	} finally {
		transmuxer.dispose()
	}
}
