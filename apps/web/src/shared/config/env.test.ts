import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
	it('applies defaults', () => {
		expect(parseEnv({})).toEqual({ VITE_PROXY_URL: '/api' })
	})

	it('keeps provided values', () => {
		expect(parseEnv({ VITE_PROXY_URL: 'https://proxy.example' })).toEqual({
			VITE_PROXY_URL: 'https://proxy.example'
		})
	})

	it('throws on invalid values', () => {
		expect(() => parseEnv({ VITE_PROXY_URL: '  ' })).toThrow(/VITE_PROXY_URL/)
	})
})
