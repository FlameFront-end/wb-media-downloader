export class HttpError extends Error {
	override readonly name = 'HttpError'
	readonly status: number
	readonly url: string

	constructor(status: number, url: string) {
		super(`Request to ${url} failed with status ${status}`)
		this.status = status
		this.url = url
	}
}

export class InvalidResponseError extends Error {
	override readonly name = 'InvalidResponseError'
	readonly url: string
	readonly details: string

	constructor(url: string, details: string) {
		super(`Unexpected response from ${url}: ${details}`)
		this.url = url
		this.details = details
	}
}

/**
 * Retry only transient failures: network errors, 5xx and 429.
 * Client errors and malformed responses won't fix themselves.
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof InvalidResponseError) {
		return false
	}

	if (error instanceof HttpError) {
		return error.status >= 500 || error.status === 429
	}

	return error instanceof TypeError
}
