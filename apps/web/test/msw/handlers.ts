import { http, HttpResponse, type RequestHandler } from 'msw'

import { cardFixture, KNOWN_NM, UPSTREAMS_URL, upstreamsFixture } from './fixtures/wb'

const CARD_URL_PATTERN = /\/vol\d+\/part\d+\/(\d+)\/info\/ru\/card\.json$/

/**
 * Default request handlers shared by all tests.
 * Override per test with `server.use(...)`.
 */
export const handlers: RequestHandler[] = [
	http.get(UPSTREAMS_URL, () => HttpResponse.json(upstreamsFixture)),

	http.get(CARD_URL_PATTERN, ({ request }) => {
		const nm = Number(CARD_URL_PATTERN.exec(new URL(request.url).pathname)?.[1])

		return nm === KNOWN_NM ? HttpResponse.json(cardFixture) : new HttpResponse('Not Found', { status: 404 })
	})
]
