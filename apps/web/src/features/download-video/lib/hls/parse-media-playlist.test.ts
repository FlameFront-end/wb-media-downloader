import { describe, expect, it } from 'vitest'

import { UnsupportedPlaylistError } from './errors'
import { parseMediaPlaylist } from './parse-media-playlist'

const PLAYLIST_URL = 'https://videonme-basket-10.wbbasket.ru/vol114/part60417/604174866/hls/1440p/index.m3u8'
const BASE = 'https://videonme-basket-10.wbbasket.ru/vol114/part60417/604174866/hls/1440p'

/** Real WB playlist (604174866, 1440p). */
const WB_PLAYLIST = `#EXTM3U
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:5
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:4.433
1.ts
#EXTINF:2.6
2.ts
#EXTINF:2.866
3.ts
#EXTINF:1.533
4.ts
#EXT-X-ENDLIST
`

describe('parseMediaPlaylist', () => {
	it('parses WB VOD playlist and resolves relative segments', () => {
		const playlist = parseMediaPlaylist(WB_PLAYLIST, PLAYLIST_URL)

		expect(playlist.segments).toEqual([
			{ url: `${BASE}/1.ts`, durationSeconds: 4.433 },
			{ url: `${BASE}/2.ts`, durationSeconds: 2.6 },
			{ url: `${BASE}/3.ts`, durationSeconds: 2.866 },
			{ url: `${BASE}/4.ts`, durationSeconds: 1.533 }
		])
		expect(playlist.durationSeconds).toBeCloseTo(11.432)
	})

	it('accepts CRLF, EXTINF titles and absolute segment urls', () => {
		const text = '#EXTM3U\r\n#EXTINF:1.5,intro\r\nhttps://cdn.example/a.ts\r\n#EXT-X-ENDLIST\r\n'

		expect(parseMediaPlaylist(text, PLAYLIST_URL).segments).toEqual([
			{ url: 'https://cdn.example/a.ts', durationSeconds: 1.5 }
		])
	})

	it('accepts explicitly unencrypted playlists', () => {
		const text = '#EXTM3U\n#EXT-X-KEY:METHOD=NONE\n#EXTINF:1,\n1.ts\n#EXT-X-ENDLIST'

		expect(parseMediaPlaylist(text, PLAYLIST_URL).segments).toHaveLength(1)
	})

	it.each([
		['not a playlist', '<html></html>'],
		['discontinuous timeline', '#EXTM3U\n#EXTINF:1,\n1.ts\n#EXT-X-DISCONTINUITY\n#EXTINF:1,\n2.ts\n#EXT-X-ENDLIST'],
		['malformed duration', '#EXTM3U\n#EXTINF:1.1.1,\n1.ts\n#EXT-X-ENDLIST'],
		['missing final segment', '#EXTM3U\n#EXTINF:1,\n1.ts\n#EXTINF:2,\n#EXT-X-ENDLIST'],
		['master playlist', '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\n1440p/index.m3u8\n#EXT-X-ENDLIST'],
		['encrypted', '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k"\n#EXTINF:1,\n1.ts\n#EXT-X-ENDLIST'],
		['fmp4 segments', '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:1,\n1.m4s\n#EXT-X-ENDLIST'],
		['byte ranges', '#EXTM3U\n#EXTINF:1,\n#EXT-X-BYTERANGE:100@0\n1.ts\n#EXT-X-ENDLIST'],
		['live (no ENDLIST)', '#EXTM3U\n#EXTINF:1,\n1.ts'],
		['no segments', '#EXTM3U\n#EXT-X-ENDLIST'],
		['segment without EXTINF', '#EXTM3U\n1.ts\n#EXT-X-ENDLIST'],
		['non-http segment', '#EXTM3U\n#EXTINF:1,\ndata:video/mp2t;base64,AA\n#EXT-X-ENDLIST']
	])('rejects %s', (_, text) => {
		expect(() => parseMediaPlaylist(text, PLAYLIST_URL)).toThrow(UnsupportedPlaylistError)
	})
})
