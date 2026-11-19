import { describe, expect, it } from 'vitest'

import { HttpError, InvalidResponseError } from '@/shared/api'

import { describeLoadError } from './describe-load-error'

describe('describeLoadError', () => {
	it.each([
		['offline', new TypeError('Failed to fetch'), false, 'Нет подключения к интернету'],
		['no response', new TypeError('Failed to fetch'), true, 'Не удалось связаться с серверами Wildberries'],
		['timeout', new DOMException('timeout', 'TimeoutError'), true, 'слишком долго отвечает'],
		['server error', new HttpError(503, 'u'), true, 'Серверы Wildberries сейчас не отвечают'],
		['rate limit', new HttpError(429, 'u'), true, 'ограничил число запросов'],
		['refused', new HttpError(403, 'u'), true, 'отклонил запрос (код 403)'],
		['bad payload', new InvalidResponseError('u', 'x'), true, 'в неожиданном формате'],
		['anything else', new Error('x'), true, 'что-то пошло не так']
	])('%s', (_, error, online, expected) => {
		expect(describeLoadError(error, online)).toContain(expected)
	})
})
