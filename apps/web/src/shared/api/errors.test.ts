import { describe, expect, it } from 'vitest'

import { HttpError, InvalidResponseError, isRetryableError } from './errors'

describe('isRetryableError', () => {
	it.each([
		['5xx', new HttpError(502, 'u'), true],
		['429', new HttpError(429, 'u'), true],
		['404', new HttpError(404, 'u'), false],
		['403', new HttpError(403, 'u'), false],
		['invalid response', new InvalidResponseError('u', 'bad'), false],
		['network error', new TypeError('Failed to fetch'), true],
		['unknown error', new Error('boom'), false]
	])('%s → %s', (_, error, expected) => {
		expect(isRetryableError(error)).toBe(expected)
	})
})
