import { expect, test as base, type Page } from '@playwright/test'

import { cardFixture, KNOWN_NM, UPSTREAMS_URL, upstreamsFixture } from '../test/msw/fixtures/wb.ts'

export { cardFixture, KNOWN_NM }

const CORS = { 'Access-Control-Allow-Origin': '*' }

/** Fake WB CDN: tests never hit the network. */
async function mockWbCdn(page: Page): Promise<void> {
	await page.route(/^https:\/\/[^/]+\.wbbasket\.ru\//, route => route.fulfill({ status: 404, headers: CORS }))
	await page.route(UPSTREAMS_URL, route => route.fulfill({ json: upstreamsFixture, headers: CORS }))
	await page.route(new RegExp(`/${KNOWN_NM}/info/ru/card\\.json$`), route =>
		route.fulfill({ json: cardFixture, headers: CORS })
	)
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
