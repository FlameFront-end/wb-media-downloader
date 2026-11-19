import { UnsupportedPlaylistError } from './errors'

export interface MediaSegment {
	url: string
	durationSeconds: number
}

export interface MediaPlaylist {
	segments: MediaSegment[]
	durationSeconds: number
}

const EXTINF_PATTERN = /^#EXTINF:(\d+(?:\.\d+)?)/

function resolveSegmentUrl(uri: string, playlistUrl: string): string {
	const url = new URL(uri, playlistUrl)

	if (url.protocol !== 'https:' && url.protocol !== 'http:') {
		throw new UnsupportedPlaylistError(`Unsupported segment url: ${uri}`)
	}

	return url.href
}

/**
 * Parses an HLS VOD media playlist with unencrypted MPEG-TS segments —
 * the format WB CDN serves and mux.js can remux. Anything else is rejected
 * explicitly instead of producing a broken file.
 */
export function parseMediaPlaylist(text: string, playlistUrl: string): MediaPlaylist {
	const lines = text
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(line => line !== '')

	if (lines[0] !== '#EXTM3U') {
		throw new UnsupportedPlaylistError('Not an HLS playlist')
	}

	const segments: MediaSegment[] = []
	let pendingDuration: number | null = null
	let ended = false

	for (const line of lines.slice(1)) {
		if (line.startsWith('#EXT-X-STREAM-INF')) {
			throw new UnsupportedPlaylistError('Master playlists are not supported')
		}

		if (line.startsWith('#EXT-X-KEY') && !line.includes('METHOD=NONE')) {
			throw new UnsupportedPlaylistError('Encrypted playlists are not supported')
		}

		if (line.startsWith('#EXT-X-MAP') || line.startsWith('#EXT-X-BYTERANGE')) {
			throw new UnsupportedPlaylistError('Only plain MPEG-TS segments are supported')
		}

		if (line === '#EXT-X-ENDLIST') {
			ended = true
			continue
		}

		const extinf = EXTINF_PATTERN.exec(line)

		if (extinf) {
			pendingDuration = Number(extinf[1])
			continue
		}

		if (line.startsWith('#')) {
			continue
		}

		if (pendingDuration === null) {
			throw new UnsupportedPlaylistError(`Segment without #EXTINF: ${line}`)
		}

		segments.push({ url: resolveSegmentUrl(line, playlistUrl), durationSeconds: pendingDuration })
		pendingDuration = null
	}

	if (!ended) {
		throw new UnsupportedPlaylistError('Live playlists are not supported')
	}

	if (segments.length === 0) {
		throw new UnsupportedPlaylistError('Playlist has no segments')
	}

	return {
		segments,
		durationSeconds: segments.reduce((total, segment) => total + segment.durationSeconds, 0)
	}
}
