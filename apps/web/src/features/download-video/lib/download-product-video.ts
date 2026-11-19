import type { ProductVideo, ProductVideoSource } from '@/entities/product'
import { fetchBytes, fetchText, HttpError, type VideoQuality } from '@/shared/api'
import { createMp4Transmuxer, parseMediaPlaylist, type MediaPlaylist } from '@/shared/lib'

export class VideoUnavailableError extends Error {
	override readonly name = 'VideoUnavailableError'
}

interface DownloadVideoOptions {
	signal?: AbortSignal
	onProgress?: (done: number, total: number) => void
}

export interface DownloadedVideo {
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

		try {
			text = await fetchText(source.playlistUrl, { signal })
		} catch (error) {
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

	const [{ quality, playlist }, transmuxer] = await Promise.all([
		resolvePlaylist(video.sources, signal),
		createMp4Transmuxer()
	])
	const total = playlist.segments.length

	onProgress?.(0, total)

	for (const [index, segment] of playlist.segments.entries()) {
		transmuxer.push(await fetchBytes(segment.url, { signal }))
		onProgress?.(index + 1, total)
	}

	signal?.throwIfAborted()

	return { quality, file: transmuxer.finish(playlist.durationSeconds) }
}
