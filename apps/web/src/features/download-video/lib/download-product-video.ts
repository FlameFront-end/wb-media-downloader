import type { ProductVideo, ProductVideoSource } from '@/entities/product'
import {
	fetchBytes,
	fetchText,
	HttpError,
	isRetryableError,
	ResponseTooLargeError,
	type VideoQuality
} from '@/shared/api'
import { MAX_DOWNLOAD_BYTES, MAX_MEDIA_RESPONSE_BYTES, type DownloadTaskContext } from '@/shared/lib'

import { UnsupportedPlaylistError } from './hls/errors'
import { createMp4Transmuxer } from './hls/mp4-transmuxer'
import { parseMediaPlaylist } from './hls/parse-media-playlist'

export class VideoUnavailableError extends Error {
	override readonly name = 'VideoUnavailableError'
}

interface DownloadVideoOptions {
	signal?: AbortSignal
	onProgress?: DownloadTaskContext['onProgress']
	maxTotalBytes?: number
}

const IDLE_TIMEOUT_MS = 12_000
const PROGRESS_STEP_BYTES = 64 * 1024

async function fetchSegment(
	url: string,
	signal: AbortSignal | undefined,
	maxBytes: number,
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
				maxBytes,
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
	{ signal, onProgress, maxTotalBytes = MAX_DOWNLOAD_BYTES }: DownloadVideoOptions
): Promise<DownloadedVideo> {
	const text = await fetchText(source.playlistUrl, { signal, timeoutMs: IDLE_TIMEOUT_MS })

	const playlist = parseMediaPlaylist(text, source.playlistUrl)
	const total = playlist.segments.length
	const transmuxer = await createMp4Transmuxer()

	try {
		onProgress?.(0, total)
		let remaining = maxTotalBytes

		for (const [index, segment] of playlist.segments.entries()) {
			const bytes = await fetchSegment(
				segment.url,
				signal,
				Math.min(MAX_MEDIA_RESPONSE_BYTES, remaining),
				received => {
					onProgress?.(index, total, received)
				}
			)
			remaining -= bytes.byteLength
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
	let unusable: UnsupportedPlaylistError | ResponseTooLargeError | undefined
	for (const source of video.sources) {
		options.signal?.throwIfAborted()
		try {
			return await downloadRendition(source, options)
		} catch (error) {
			options.signal?.throwIfAborted()
			if (error instanceof ResponseTooLargeError) {
				unusable = error
			} else if (error instanceof UnsupportedPlaylistError) {
				unusable ??= error
			} else if (!(error instanceof HttpError && error.status === 404)) {
				throw error
			}
		}
	}

	throw unusable ?? new VideoUnavailableError('No complete video rendition is available on CDN')
}
