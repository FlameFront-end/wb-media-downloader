/**
 * `fetch` and `AbortSignal.throwIfAborted()` reject with a DOMException named "AbortError".
 * Checked by name: DOMException is not an `Error` subclass in every environment (e.g. jsdom).
 */
export function isAbortError(error: unknown): boolean {
	return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
}
