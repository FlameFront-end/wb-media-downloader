import { describe, expect, it } from 'vitest'

import { isAbortError } from './is-abort-error'

describe('isAbortError', () => {
	it('detects abort errors', () => {
		const controller = new AbortController()
		controller.abort()

		expect(isAbortError(controller.signal.reason)).toBe(true)
		expect(isAbortError(new DOMException('x', 'AbortError'))).toBe(true)
	})

	it.each([new Error('x'), new TypeError('x'), 'AbortError', null, { message: 'AbortError' }])(
		'ignores %s',
		value => {
			expect(isAbortError(value)).toBe(false)
		}
	)
})
