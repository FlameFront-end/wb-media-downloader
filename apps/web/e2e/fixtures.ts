import { expect, test as base, type Page } from '@playwright/test'

import { playlistFixture, segmentFixtures } from '../test/msw/fixtures/hls.ts'
import { photoBytes } from '../test/msw/fixtures/photos.ts'
import { cardFixture, KNOWN_NM, UPSTREAMS_URL, upstreamsFixture } from '../test/msw/fixtures/wb.ts'

export { cardFixture, KNOWN_NM, photoBytes }

const CORS = { 'Access-Control-Allow-Origin': '*' }

const CARD_URL = new RegExp(`/${KNOWN_NM}/info/ru/card\\.json$`)
const PHOTO_URL = /\/\d+\/images\/big\/(\d+)\.webp$/
const PLAYLIST_URL = /\/hls\/\w+\/index\.m3u8$/
const SEGMENT_URL = /\/hls\/\w+\/(\d+)\.ts$/

/** Fake WB CDN, same data as the MSW handlers: tests never hit the network. */
async function mockWbCdn(page: Page): Promise<void> {
	// Registered first, so it only catches what the specific routes below do not
	await page.route(/^https:\/\/[^/]+\.wbbasket\.ru\//, route => route.fulfill({ status: 404, headers: CORS }))
	await page.route(UPSTREAMS_URL, route => route.fulfill({ json: upstreamsFixture, headers: CORS }))
	await page.route(CARD_URL, route => route.fulfill({ json: cardFixture, headers: CORS }))
	await page.route(PHOTO_URL, route => {
		const [, index] = PHOTO_URL.exec(route.request().url()) ?? []
		const body = Buffer.from(photoBytes(Number(index)))

		return route.fulfill({ body, contentType: 'image/webp', headers: CORS })
	})
	await page.route(PLAYLIST_URL, route =>
		route.fulfill({ body: playlistFixture, contentType: 'application/vnd.apple.mpegurl', headers: CORS })
	)
	await page.route(SEGMENT_URL, route => {
		const segment = segmentFixtures[SEGMENT_URL.exec(route.request().url())?.[1] ?? '']

		return segment
			? route.fulfill({ body: Buffer.from(segment), contentType: 'video/mp2t', headers: CORS })
			: route.fulfill({ status: 404, headers: CORS })
	})
}

interface Fixtures {
	/** Uncaught errors and unhandled rejections thrown by the page. */
	pageErrors: Error[]
}

export const test = base.extend<Fixtures>({
	pageErrors: [
		async ({ page }, use) => {
			const errors: Error[] = []
			page.on('pageerror', error => errors.push(error))
			await mockWbCdn(page)
			await use(errors)
			expect(errors, 'page must not throw uncaught errors').toEqual([])
		},
		// Every test gets the fake CDN and the uncaught-error check, even without asking for the fixture
		{ auto: true }
	]
})

export { expect }
