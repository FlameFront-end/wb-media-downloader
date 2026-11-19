import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { HttpError, InvalidResponseError, upstreamsSchema } from '@/shared/api'

import { cardFixture, KNOWN_NM, MISSING_NM, OUT_OF_RANGE_NM, upstreamsFixture } from '../../../../test/msw/fixtures/wb'
import { server } from '../../../../test/msw/server'
import { ProductNotFoundError } from '../model/errors'

import { getProduct } from './get-product'

const upstreams = upstreamsSchema.parse(upstreamsFixture)
const CARD_URL = 'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/info/ru/card.json'

describe('getProduct', () => {
	it('loads and maps product card', async () => {
		const product = await getProduct(KNOWN_NM, upstreams)

		expect(product.id).toBe(KNOWN_NM)
		expect(product.name).toBe(cardFixture.imt_name)
		expect(product.photos).toHaveLength(cardFixture.media.photo_count)
		expect(product.video?.sources[0]?.quality).toBe('1440p')
	})

	it('loads the photos when the CDN omits the video flag', async () => {
		server.use(http.get(CARD_URL, () => HttpResponse.json({ nm_id: KNOWN_NM, media: { photo_count: 6 } })))

		const product = await getProduct(KNOWN_NM, upstreams)
		expect(product.photos).toHaveLength(6)
		expect(product).toMatchObject({ video: null, videoAvailability: 'unknown' })
	})

	it('throws ProductNotFoundError when card is missing (404)', async () => {
		await expect(getProduct(MISSING_NM, upstreams)).rejects.toBeInstanceOf(ProductNotFoundError)
	})

	it('throws ProductNotFoundError without request when no host covers vol', async () => {
		await expect(getProduct(OUT_OF_RANGE_NM, upstreams)).rejects.toBeInstanceOf(ProductNotFoundError)
	})

	it.each([0, -1, 1.5, Number.NaN])('throws ProductNotFoundError for invalid nm %s', async nm => {
		await expect(getProduct(nm, upstreams)).rejects.toBeInstanceOf(ProductNotFoundError)
	})

	it('falls back to generic name when card name is blank', async () => {
		server.use(http.get(CARD_URL, () => HttpResponse.json({ ...cardFixture, imt_name: '   ' })))

		await expect(getProduct(KNOWN_NM, upstreams)).resolves.toMatchObject({ name: `Товар ${KNOWN_NM}` })
	})

	it('keeps HttpError for non-404 failures', async () => {
		server.use(http.get(CARD_URL, () => new HttpResponse(null, { status: 503 })))

		await expect(getProduct(KNOWN_NM, upstreams)).rejects.toBeInstanceOf(HttpError)
	})

	it('throws InvalidResponseError on malformed card', async () => {
		server.use(http.get(CARD_URL, () => HttpResponse.json({ nm_id: KNOWN_NM, media: { photo_count: '20' } })))

		await expect(getProduct(KNOWN_NM, upstreams)).rejects.toBeInstanceOf(InvalidResponseError)
	})

	it('throws InvalidResponseError when card belongs to another product', async () => {
		server.use(http.get(CARD_URL, () => HttpResponse.json({ ...cardFixture, nm_id: 1 })))

		await expect(getProduct(KNOWN_NM, upstreams)).rejects.toBeInstanceOf(InvalidResponseError)
	})
})
