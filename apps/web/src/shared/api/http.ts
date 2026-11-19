import * as z from 'zod/mini'

import { HttpError, InvalidResponseError } from './errors'

const DEFAULT_TIMEOUT_MS = 15_000

interface RequestOptions {
	signal?: AbortSignal
	timeoutMs?: number
}

async function withRequestTimeout<Result>(
	url: string,
	{ signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions,
	read: (requestSignal: AbortSignal, onActivity: () => void) => Promise<Result>
): Promise<Result> {
	signal?.throwIfAborted()
	const timeout = new AbortController()
	const requestSignal = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal
	let timer: ReturnType<typeof setTimeout> | undefined
	const onActivity = () => {
		requestSignal.throwIfAborted()
		clearTimeout(timer)
		timer = setTimeout(() => {
			timeout.abort(new DOMException(`Timed out while reading ${url}`, 'TimeoutError'))
		}, timeoutMs)
	}

	onActivity()
	try {
		const result = await read(requestSignal, onActivity)
		requestSignal.throwIfAborted()
		return result
	} catch (error) {
		// Fetch may surface a generic AbortError once the response body has started.
		signal?.throwIfAborted()
		timeout.signal.throwIfAborted()
		throw error
	} finally {
		clearTimeout(timer)
	}
}

export async function fetchJson<Schema extends z.ZodMiniType>(
	url: string,
	schema: Schema,
	options: RequestOptions = {}
): Promise<z.output<Schema>> {
	const body: unknown = await withRequestTimeout(url, options, async signal => {
		const response = await fetchOk(url, { signal, headers: { Accept: 'application/json' } })
		try {
			return (await response.json()) as unknown
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new InvalidResponseError(url, 'body is not valid JSON')
			}
			throw error
		}
	})

	const result = schema.safeParse(body)

	if (!result.success) {
		throw new InvalidResponseError(url, z.prettifyError(result.error))
	}

	return result.data
}

async function fetchOk(url: string, init: RequestInit): Promise<Response> {
	const response = await fetch(url, init)

	if (!response.ok) {
		throw new HttpError(response.status, url)
	}

	return response
}

interface ByteRequestOptions extends RequestOptions {
	onBytes?: (received: number) => void
}

/** The binary timeout measures inactivity rather than the whole transfer. */
export function fetchBytes(
	url: string,
	{ onBytes, ...options }: ByteRequestOptions = {}
): Promise<Uint8Array<ArrayBuffer>> {
	return withRequestTimeout(url, options, async (signal, onActivity) => {
		const response = await fetchOk(url, { signal })
		onActivity()
		if (!response.body) {
			return new Uint8Array(await response.arrayBuffer())
		}

		let received = 0
		const stream = response.body.pipeThrough(
			new TransformStream({
				transform(chunk, controller) {
					onActivity()
					received += chunk.byteLength
					onBytes?.(received)
					controller.enqueue(chunk)
				}
			})
		)
		return new Uint8Array(await new Response(stream).arrayBuffer())
	})
}

export function fetchText(url: string, options: RequestOptions = {}): Promise<string> {
	return withRequestTimeout(url, options, async signal => {
		const response = await fetchOk(url, { signal })
		return response.text()
	})
}
