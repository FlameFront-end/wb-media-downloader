import { describe, expect, it } from 'vitest'

import { buildCardInfoUrl, buildPhotoUrl, buildVideoPlaylistUrl, resolveHost } from './media-urls'
import type { HostRange } from './upstreams'

const mediaHosts: HostRange[] = [
	{ from: 0, to: 143, host: 'basket-01.wbbasket.ru' },
	{ from: 144, to: 287, host: 'basket-02.wbbasket.ru' },
	{ from: 5814, to: 6125, host: 'basket-30.wbbasket.ru' }
]

const videoHosts: HostRange[] = [
	{ from: 0, to: 11, host: 'videonme-basket-01.wbbasket.ru' },
	{ from: 108, to: 119, host: 'videonme-basket-10.wbbasket.ru' }
]

describe('resolveHost', () => {
	it.each([
		[0, 'basket-01.wbbasket.ru'],
		[143, 'basket-01.wbbasket.ru'],
		[144, 'basket-02.wbbasket.ru'],
		[287, 'basket-02.wbbasket.ru'],
		[5814, 'basket-30.wbbasket.ru'],
		[6125, 'basket-30.wbbasket.ru']
	])('vol %i → %s', (vol, host) => {
		expect(resolveHost(mediaHosts, vol)).toBe(host)
	})

	it.each([288, 5813, 6126, 999_999])('vol %i outside ranges → null', vol => {
		expect(resolveHost(mediaHosts, vol)).toBeNull()
	})

	it('returns null for empty ranges', () => {
		expect(resolveHost([], 0)).toBeNull()
	})
})

describe('media urls for nm 604174866', () => {
	const nm = 604174866

	it('builds card info url', () => {
		expect(buildCardInfoUrl(nm, mediaHosts)).toBe(
			'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/info/ru/card.json'
		)
	})

	it('builds photo url', () => {
		expect(buildPhotoUrl(nm, mediaHosts, 'big', 1)).toBe(
			'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/big/1.webp'
		)
	})

	it('builds video playlist url (vol = nm % 144)', () => {
		expect(buildVideoPlaylistUrl(nm, videoHosts, '1440p')).toBe(
			'https://videonme-basket-10.wbbasket.ru/vol114/part60417/604174866/hls/1440p/index.m3u8'
		)
	})
})

describe('media urls on vol boundaries', () => {
	it('uses last nm of a range', () => {
		expect(buildCardInfoUrl(14_399_999, mediaHosts)).toBe(
			'https://basket-01.wbbasket.ru/vol143/part14399/14399999/info/ru/card.json'
		)
	})

	it('switches host on first nm of the next range', () => {
		expect(buildCardInfoUrl(14_400_000, mediaHosts)).toBe(
			'https://basket-02.wbbasket.ru/vol144/part14400/14400000/info/ru/card.json'
		)
	})

	it('returns null when no host covers vol', () => {
		expect(buildCardInfoUrl(28_800_000, mediaHosts)).toBeNull()
		expect(buildPhotoUrl(28_800_000, mediaHosts, 'big', 1)).toBeNull()
		expect(buildVideoPlaylistUrl(50, videoHosts, '720p')).toBeNull()
	})
})
