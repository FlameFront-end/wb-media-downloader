import { describe, expect, it } from 'vitest'

import { upstreamsSchema } from '@/shared/api'

import { upstreamsFixture } from '../../../../test/msw/fixtures/wb'

import { mapProduct } from './map-product'

const upstreams = upstreamsSchema.parse(upstreamsFixture)
const nm = 604174866

describe('mapProduct', () => {
	it('maps photos and video sources', () => {
		const product = mapProduct(
			{ nm_id: nm, imt_name: 'Джинсы', media: { photo_count: 2, has_video: true } },
			upstreams
		)

		expect(product).toEqual({
			id: nm,
			name: 'Джинсы',
			photos: [
				{
					index: 1,
					thumbnailUrl: `https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/c246x328/1.webp`,
					previewUrl: 'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/c516x688/1.webp',
					originalUrl: 'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/big/1.webp'
				},
				{
					index: 2,
					thumbnailUrl: `https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/c246x328/2.webp`,
					previewUrl: 'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/c516x688/2.webp',
					originalUrl: 'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/big/2.webp'
				}
			],
			video: {
				sources: ['1440p', '1080p', '720p'].map(quality => ({
					quality,
					playlistUrl: `https://videonme-basket-10.wbbasket.ru/vol114/part60417/604174866/hls/${quality}/index.m3u8`
				}))
			}
		})
	})

	it('handles card without media and name', () => {
		expect(mapProduct({ nm_id: nm }, upstreams)).toEqual({
			id: nm,
			name: `Товар ${nm}`,
			photos: [],
			video: null
		})
	})

	it('returns null video when has_video is false', () => {
		const product = mapProduct({ nm_id: nm, media: { photo_count: 0, has_video: false } }, upstreams)

		expect(product.video).toBeNull()
	})

	it('returns null video when no video host covers the product', () => {
		const product = mapProduct({ nm_id: 50, media: { photo_count: 0, has_video: true } }, upstreams)

		expect(product.video).toBeNull()
	})
})
