import { QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { cardFixture, KNOWN_NM, MISSING_NM, UPSTREAMS_URL, upstreamsFixture } from '../../../../test/msw/fixtures/wb'
import { server } from '../../../../test/msw/server'
import { ProductNotFoundError } from '../model/errors'

import { productQueries } from './product.queries'

const CARD_URL = 'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/info/ru/card.json'

function createClient() {
	return new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
}

describe('productQueries.detail', () => {
	it('fetches upstreams once and reuses them for other products', async () => {
		let upstreamsRequests = 0
		server.use(
			http.get(UPSTREAMS_URL, () => {
				upstreamsRequests++
				return HttpResponse.json(upstreamsFixture)
			})
		)
		const client = createClient()

		await client.query(productQueries.detail(KNOWN_NM))
		await client.query(productQueries.detail(MISSING_NM)).catch(() => undefined)

		expect(upstreamsRequests).toBe(1)
	})

	it('does not retry when product is not found', async () => {
		let cardRequests = 0
		server.use(
			http.get(/card\.json$/, () => {
				cardRequests++
				return new HttpResponse(null, { status: 404 })
			})
		)

		await expect(createClient().query(productQueries.detail(MISSING_NM))).rejects.toBeInstanceOf(
			ProductNotFoundError
		)
		expect(cardRequests).toBe(1)
	})

	it('retries transient server errors', async () => {
		let cardRequests = 0
		server.use(
			http.get(CARD_URL, () => {
				cardRequests++
				return cardRequests === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(cardFixture)
			})
		)

		const product = await createClient().query(productQueries.detail(KNOWN_NM))

		expect(product.id).toBe(KNOWN_NM)
		expect(cardRequests).toBe(2)
	})
})
