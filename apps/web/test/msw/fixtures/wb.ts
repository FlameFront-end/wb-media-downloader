export const UPSTREAMS_URL = 'https://cdn.wbbasket.ru/api/v3/upstreams'

/** Real article from the task, served by basket-30 / videonme-basket-10. */
export const KNOWN_NM = 604174866
/** Same CDN host as KNOWN_NM, but no card. */
export const MISSING_NM = 604174867
/** vol 30000 is beyond every media range below. */
export const OUT_OF_RANGE_NM = 3_000_000_000

export const upstreamsFixture = {
	recommend: {
		mediabasket_route_map: [{ method: 'mod', hosts: [{ host: 'mow-basket-cdn-02.geobasket.ru' }] }]
	},
	origin: {
		mediabasket_route_map: [
			{
				method: 'range',
				hosts: [
					{ vol_range_from: 0, vol_range_to: 143, host: 'basket-01.wbbasket.ru' },
					{ vol_range_from: 144, vol_range_to: 287, host: 'basket-02.wbbasket.ru' },
					{ vol_range_from: 5814, vol_range_to: 6125, host: 'basket-30.wbbasket.ru' }
				]
			}
		],
		videonme_route_map: [
			{
				method: 'range',
				hosts: [
					{ vol_range_from: 0, vol_range_to: 11, host: 'videonme-basket-01.wbbasket.ru' },
					{ vol_range_from: 108, vol_range_to: 119, host: 'videonme-basket-10.wbbasket.ru' }
				]
			}
		]
	},
	metrics_url: ''
}

export const cardFixture = {
	imt_id: 1,
	nm_id: KNOWN_NM,
	imt_name: 'Джинсы бананы широкие',
	media: { has_video: true, photo_count: 3, best_qualities_photos: [1, 2, 3] }
}
