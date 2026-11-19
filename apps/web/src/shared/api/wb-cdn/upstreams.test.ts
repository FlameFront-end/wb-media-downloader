import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { UPSTREAMS_URL, upstreamsFixture } from '../../../../test/msw/fixtures/wb'
import { server } from '../../../../test/msw/server'
import { HttpError, InvalidResponseError } from '../errors'

import { getUpstreams, upstreamsSchema } from './upstreams'

function withMediaHosts(hosts: unknown[]) {
	return {
		...upstreamsFixture,
		origin: { ...upstreamsFixture.origin, mediabasket_route_map: [{ method: 'range', hosts }] }
	}
}

describe('upstreamsSchema', () => {
	it('maps origin range maps to host ranges', () => {
		const result = upstreamsSchema.parse(upstreamsFixture)

		expect(result.mediaHosts[0]).toEqual({ from: 0, to: 143, host: 'basket-01.wbbasket.ru' })
		expect(result.videoHosts).toHaveLength(2)
	})

	it.each([
		['unsafe host', withMediaHosts([{ vol_range_from: 0, vol_range_to: 1, host: 'evil.test/path?' }])],
		['inverted range', withMediaHosts([{ vol_range_from: 10, vol_range_to: 1, host: 'basket-01.wbbasket.ru' }])],
		['negative vol', withMediaHosts([{ vol_range_from: -1, vol_range_to: 1, host: 'basket-01.wbbasket.ru' }])],
		['empty hosts', withMediaHosts([])],
		[
			'non-range method',
			{
				...upstreamsFixture,
				origin: { ...upstreamsFixture.origin, mediabasket_route_map: [{ method: 'mod', hosts: [] }] }
			}
		],
		['missing origin', { recommend: upstreamsFixture.recommend }]
	])('rejects %s', (_, payload) => {
		expect(upstreamsSchema.safeParse(payload).success).toBe(false)
	})
})

describe('getUpstreams', () => {
	it('loads upstreams from configured url', async () => {
		const upstreams = await getUpstreams()

		expect(upstreams.mediaHosts.at(-1)?.host).toBe('basket-30.wbbasket.ru')
	})

	it('throws HttpError on server error', async () => {
		server.use(http.get(UPSTREAMS_URL, () => new HttpResponse(null, { status: 500 })))

		await expect(getUpstreams()).rejects.toBeInstanceOf(HttpError)
	})

	it('throws InvalidResponseError on unexpected shape', async () => {
		server.use(http.get(UPSTREAMS_URL, () => HttpResponse.json({ origin: {} })))

		await expect(getUpstreams()).rejects.toBeInstanceOf(InvalidResponseError)
	})
})
