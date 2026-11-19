import { z } from 'zod'

import { HttpError, InvalidResponseError } from './errors'

interface RequestOptions {
	signal?: AbortSignal
}

export async function fetchJson<Schema extends z.ZodType>(
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
