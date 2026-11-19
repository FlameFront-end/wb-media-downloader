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

async function fetchSegment(
	url: string,
	signal: AbortSignal | undefined,
	onBytes: (received: number) => void
): Promise<Uint8Array<ArrayBuffer>> {
	for (let attempt = 0; ; attempt++) {
		signal?.throwIfAborted()
		let reported = 0
		try {
			if (attempt > 0) {
				onBytes(0)
			}
			return await fetchBytes(url, {
				signal,
				timeoutMs: IDLE_TIMEOUT_MS,
				onBytes(received) {
					if (received - reported >= PROGRESS_STEP_BYTES) {
						reported = received
						onBytes(received)
					}
				}
			})
		} catch (error) {
			signal?.throwIfAborted()
			if (attempt > 0 || !isRetryableError(error)) {
				throw error
			}
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
	const text = await fetchText(source.playlistUrl, { signal, timeoutMs: IDLE_TIMEOUT_MS })

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
