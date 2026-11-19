import type { ProductVideo, ProductVideoSource } from '@/entities/product'
import { fetchBytes, fetchText, HttpError, isRetryableError, type VideoQuality } from '@/shared/api'
import {
	createMp4Transmuxer,
	parseMediaPlaylist,
	type DownloadTaskContext,
	UnsupportedPlaylistError
} from '@/shared/lib'

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

async function downloadRendition(
	source: ProductVideoSource,
	{ signal, onProgress }: DownloadVideoOptions
): Promise<DownloadedVideo> {
	const timeout = AbortSignal.timeout(IDLE_TIMEOUT_MS)
	let text: string
	try {
		text = await fetchText(source.playlistUrl, {
			signal: signal ? AbortSignal.any([signal, timeout]) : timeout
		})
	} catch (error) {
		signal?.throwIfAborted()
		timeout.throwIfAborted()
		throw error
	}

	const playlist = parseMediaPlaylist(text, source.playlistUrl)
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

		return { quality: source.quality, file: transmuxer.finish(playlist.durationSeconds) }
	} finally {
		transmuxer.dispose()
	}
}

/** Saves the highest usable rendition as fMP4. Each attempt owns and disposes its muxer. */
export async function downloadProductVideo(
	video: ProductVideo,
	options: DownloadVideoOptions = {}
): Promise<DownloadedVideo> {
	let unsupported: UnsupportedPlaylistError | undefined
	for (const source of video.sources) {
		options.signal?.throwIfAborted()
		try {
			return await downloadRendition(source, options)
		} catch (error) {
			options.signal?.throwIfAborted()
			if (error instanceof UnsupportedPlaylistError) {
				unsupported ??= error
			} else if (!(error instanceof HttpError && error.status === 404)) {
				throw error
			}
		}
	}

	throw unsupported ?? new VideoUnavailableError('No complete video rendition is available on CDN')
}
