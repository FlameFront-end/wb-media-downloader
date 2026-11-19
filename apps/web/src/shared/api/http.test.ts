import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import * as z from 'zod/mini'

import { server } from '../../../test/msw/server'

import { HttpError, InvalidResponseError, isRetryableError } from './errors'
import { fetchBytes, fetchJson } from './http'

const URL = 'https://api.example.test/item'
const schema = z.object({ id: z.number() })

describe('fetchJson', () => {
	it('returns parsed body', async () => {
		server.use(http.get(URL, () => HttpResponse.json({ id: 1, extra: true })))

		await expect(fetchJson(URL, schema)).resolves.toEqual({ id: 1 })
	})

	it('throws HttpError on non-2xx status', async () => {
		server.use(http.get(URL, () => new HttpResponse(null, { status: 503 })))

		const error = await fetchJson(URL, schema).catch((e: unknown) => e)

		expect(error).toBeInstanceOf(HttpError)
		expect(error).toMatchObject({ status: 503, url: URL })
	})

	it('throws InvalidResponseError on invalid JSON', async () => {
		server.use(http.get(URL, () => new HttpResponse('<html>', { headers: { 'Content-Type': 'text/html' } })))

		await expect(fetchJson(URL, schema)).rejects.toBeInstanceOf(InvalidResponseError)
	})

	it('throws InvalidResponseError when body does not match schema', async () => {
		server.use(http.get(URL, () => HttpResponse.json({ id: 'one' })))

		await expect(fetchJson(URL, schema)).rejects.toThrow(InvalidResponseError)
	})

	it('propagates abort before the request is sent', async () => {
		server.use(http.get(URL, () => HttpResponse.json({ id: 1 })))
		const controller = new AbortController()
		controller.abort()

		await expect(fetchJson(URL, schema, { signal: controller.signal })).rejects.toMatchObject({
			name: 'AbortError'
		})
	})

	describe('while reading the body', () => {
		/**
		 * Responds with headers and part of the body, then stalls.
		 * `reading` resolves once fetch has resolved and `response.json()` started reading.
		 */
		function stallingBody() {
			const stream = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('{"id":'))
				}
			})

			server.use(
				http.get(URL, () => new HttpResponse(stream, { headers: { 'Content-Type': 'application/json' } }))
			)

			const reading = new Promise<void>(resolve => {
				const originalJson = Object.getOwnPropertyDescriptor(Response.prototype, 'json')?.value as (
					this: Response
				) => Promise<unknown>
				vi.spyOn(Response.prototype, 'json').mockImplementation(function (this: Response) {
					resolve()
					return originalJson.call(this)
				})
			})

			return { reading }
		}

		it('propagates abort as AbortError, not InvalidResponseError', async () => {
			const { reading } = stallingBody()
			const controller = new AbortController()

			const request = fetchJson(URL, schema, { signal: controller.signal })
			await reading
			controller.abort()

			const error = await request.catch((e: unknown) => e)

			expect(error).not.toBeInstanceOf(InvalidResponseError)
			expect(error).toMatchObject({ name: 'AbortError' })
		})

		it('keeps custom abort reason', async () => {
			const { reading } = stallingBody()
			const controller = new AbortController()
			const reason = new Error('modal closed')

			const request = fetchJson(URL, schema, { signal: controller.signal })
			await reading
			controller.abort(reason)

			await expect(request).rejects.toBe(reason)
		})

		it('keeps network error retryable', async () => {
			// MSW ends an errored mock stream instead of failing it, so the network
			// failure is reproduced with a real Response whose body errors mid-read.
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('{"id":'))
					controller.error(new TypeError('network connection lost'))
				}
			})
			vi.stubGlobal('fetch', () => Promise.resolve(new Response(body, { status: 200 })))

			const error = await fetchJson(URL, schema).catch((e: unknown) => e)

			expect(error).toBeInstanceOf(TypeError)
			expect(isRetryableError(error)).toBe(true)
		})
	})
})

describe('request timeout', () => {
	function noResponse(_url: string, init?: RequestInit) {
		return new Promise<Response>((_resolve, reject) => {
			init?.signal?.addEventListener('abort', () => {
				reject(new DOMException('request aborted', 'AbortError'))
			})
		})
	}

	it.each([
		['JSON', () => fetchJson(URL, schema, { timeoutMs: 20 })],
		['binary', () => fetchBytes(URL, { timeoutMs: 20 })]
	])('bounds a stalled %s request and exposes a retryable timeout', async (_, request) => {
		vi.useFakeTimers()
		try {
			vi.stubGlobal('fetch', noResponse)
			const result = request().catch((error: unknown) => error)
			await vi.advanceTimersByTimeAsync(20)

			const error = await result
			expect(error).toMatchObject({ name: 'TimeoutError' })
			expect(isRetryableError(error)).toBe(true)
		} finally {
			vi.useRealTimers()
		}
	})
})
