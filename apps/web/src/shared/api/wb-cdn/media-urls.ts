import type { HostRange } from './upstreams'

export const PHOTO_SIZES = ['tm', 'c246x328', 'c516x688', 'big', 'hq'] as const
export type PhotoSize = (typeof PHOTO_SIZES)[number]

/** Ordered from best to worst. */
export const VIDEO_QUALITIES = ['1440p', '1080p', '720p'] as const
export type VideoQuality = (typeof VIDEO_QUALITIES)[number]

const VIDEO_VOL_MODULO = 144

export function resolveHost(ranges: readonly HostRange[], vol: number): string | null {
	return ranges.find(range => vol >= range.from && vol <= range.to)?.host ?? null
}

function mediaBasePath(nm: number, mediaHosts: readonly HostRange[]): string | null {
	const vol = Math.floor(nm / 1e5)
	const part = Math.floor(nm / 1e3)
	const host = resolveHost(mediaHosts, vol)

	return host ? `https://${host}/vol${vol}/part${part}/${nm}` : null
}

export function buildCardInfoUrl(nm: number, mediaHosts: readonly HostRange[]): string | null {
	const base = mediaBasePath(nm, mediaHosts)

	return base ? `${base}/info/ru/card.json` : null
}

/** `index` is 1-based, as on WB CDN. */
export function buildPhotoUrl(
	nm: number,
	mediaHosts: readonly HostRange[],
	size: PhotoSize,
	index: number
): string | null {
	const base = mediaBasePath(nm, mediaHosts)

	return base ? `${base}/images/${size}/${index}.webp` : null
}

export function buildVideoPlaylistUrl(
	nm: number,
	videoHosts: readonly HostRange[],
	quality: VideoQuality
): string | null {
	const vol = nm % VIDEO_VOL_MODULO
	const part = Math.floor(nm / 1e4)
	const host = resolveHost(videoHosts, vol)

	return host ? `https://${host}/vol${vol}/part${part}/${nm}/hls/${quality}/index.m3u8` : null
}
