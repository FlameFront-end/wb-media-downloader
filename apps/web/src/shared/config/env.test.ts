import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
	it('applies default upstreams url', () => {
		expect(parseEnv({})).toEqual({ VITE_WB_UPSTREAMS_URL: 'https://cdn.wbbasket.ru/api/v3/upstreams' })
	})

	it('keeps provided http(s) url', () => {
		expect(parseEnv({ VITE_WB_UPSTREAMS_URL: 'http://localhost:4000/upstreams' })).toEqual({
			VITE_WB_UPSTREAMS_URL: 'http://localhost:4000/upstreams'
		})
	})

	it.each([
		['empty string', ''],
		['relative path', '/api/upstreams'],
		['non-http protocol', 'ftp://cdn.example/upstreams'],
		['trailing slash', 'https://cdn.wbbasket.ru/api/v3/upstreams/'],
		['not a url', 'upstreams']
	])('rejects %s', (_, value) => {
		expect(() => parseEnv({ VITE_WB_UPSTREAMS_URL: value })).toThrow(/VITE_WB_UPSTREAMS_URL/)
	})
})
