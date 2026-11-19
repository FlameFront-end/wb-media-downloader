import * as z from 'zod/mini'

import { HttpError, InvalidResponseError } from './errors'

interface RequestOptions {
	signal?: AbortSignal
}

export async function fetchJson<Schema extends z.ZodMiniType>(
	url: string,
	schema: Schema,
	{ signal }: RequestOptions = {}
): Promise<z.output<Schema>> {
	const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })

	if (!response.ok) {
		throw new HttpError(response.status, url)
	}

	let body: unknown

	try {
		body = await response.json()
	} catch (error) {
		// Only a parse failure means a malformed response. Abort and network errors
		// while reading the body must keep their original cause (and retry semantics).
		if (error instanceof SyntaxError) {
			throw new InvalidResponseError(url, 'body is not valid JSON')
		}

		throw error
	}

	const result = schema.safeParse(body)

	if (!result.success) {
		throw new InvalidResponseError(url, z.prettifyError(result.error))
	}

	return result.data
}

async function fetchOk(url: string, { signal }: RequestOptions): Promise<Response> {
	const response = await fetch(url, { signal })

	if (!response.ok) {
		throw new HttpError(response.status, url)
	}

	return response
}

export async function fetchBytes(url: string, options: RequestOptions = {}): Promise<Uint8Array<ArrayBuffer>> {
	const response = await fetchOk(url, options)

	return new Uint8Array(await response.arrayBuffer())
}

export async function fetchText(url: string, options: RequestOptions = {}): Promise<string> {
	const response = await fetchOk(url, options)

	return response.text()
}
