import { http, HttpResponse, type RequestHandler } from 'msw'

import { photoBytes, playlistFixture, segmentFixtures } from './fixtures/hls'
import { cardFixture, KNOWN_NM, UPSTREAMS_URL, upstreamsFixture } from './fixtures/wb'

const CARD_URL_PATTERN = /\/vol\d+\/part\d+\/(\d+)\/info\/ru\/card\.json$/
const PHOTO_URL_PATTERN = /\/vol\d+\/part\d+\/(\d+)\/images\/big\/(\d+)\.webp$/
const PLAYLIST_URL_PATTERN = /\/hls\/(?:1440p|1080p|720p)\/index\.m3u8$/
const SEGMENT_URL_PATTERN = /\/hls\/(?:1440p|1080p|720p)\/(\d+)\.ts$/

function matchPath(request: Request, pattern: RegExp): RegExpExecArray | null {
	return pattern.exec(new URL(request.url).pathname)
}

/**
 * Default request handlers shared by all tests: a fake WB CDN.
 * Override per test with `server.use(...)`.
 */
export const handlers: RequestHandler[] = [
	http.get(UPSTREAMS_URL, () => HttpResponse.json(upstreamsFixture)),

	http.get(CARD_URL_PATTERN, ({ request }) => {
		const nm = Number(matchPath(request, CARD_URL_PATTERN)?.[1])

		return nm === KNOWN_NM ? HttpResponse.json(cardFixture) : new HttpResponse('Not Found', { status: 404 })
	}),

	http.get(PHOTO_URL_PATTERN, ({ request }) => {
		const [, nm, index] = matchPath(request, PHOTO_URL_PATTERN) ?? []

		return HttpResponse.arrayBuffer(photoBytes(Number(nm), Number(index)).buffer, {
			headers: { 'Content-Type': 'image/webp' }
		})
	}),

	http.get(
		PLAYLIST_URL_PATTERN,
		() => new HttpResponse(playlistFixture, { headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } })
	),

	http.get(SEGMENT_URL_PATTERN, ({ request }) => {
		const segment = segmentFixtures[matchPath(request, SEGMENT_URL_PATTERN)?.[1] ?? '']

		return segment
			? HttpResponse.arrayBuffer(segment.slice().buffer, { headers: { 'Content-Type': 'video/mp2t' } })
			: new HttpResponse('Not Found', { status: 404 })
	})
]
