import { fetchBytes, isRetryableError } from '@/shared/api'
import { isAbortError, mapWithConcurrency } from '@/shared/lib'

export interface ZipEntry {
	url: string
	filename: string
}

export class PhotoDownloadError extends Error {
	override readonly name = 'PhotoDownloadError'
	readonly filename: string

	constructor(filename: string, cause: unknown) {
		super(`Failed to download ${filename}`, { cause })
		this.filename = filename
	}
}

interface CreatePhotosZipOptions {
	signal?: AbortSignal
	onProgress?: (done: number, total: number) => void
	/** Parallel downloads: enough to saturate the connection without flooding the CDN. */
	concurrency?: number
	/** Extra attempts per photo on transient errors (network, 5xx, 429). */
	retries?: number
}

async function fetchWithRetry(url: string, retries: number, signal: AbortSignal): Promise<Uint8Array> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fetchBytes(url, { signal })
		} catch (error) {
			if (attempt >= retries || signal.aborted || !isRetryableError(error)) {
				throw error
			}
		}
	}
}

/**
 * Downloads photos in parallel and streams them into a ZIP as they arrive.
 * Files are stored without compression: WebP is already compressed, deflating
 * it again only burns CPU. fflate is loaded on demand.
 */
export async function createPhotosZip(
	entries: readonly ZipEntry[],
	{ signal, onProgress, concurrency = 4, retries = 1 }: CreatePhotosZipOptions = {}
): Promise<Blob> {
	signal?.throwIfAborted()

	const { Zip, ZipPassThrough } = await import('fflate')

	const chunks: Uint8Array<ArrayBuffer>[] = []
	const zipErrors: Error[] = []
	const zip = new Zip((error, chunk) => {
		if (error) {
			zipErrors.push(error)
			return
		}

		chunks.push(chunk)
	})

	let done = 0
	onProgress?.(done, entries.length)

	await mapWithConcurrency(
		entries,
		concurrency,
		async (entry, _, workerSignal) => {
			let bytes: Uint8Array

			try {
				bytes = await fetchWithRetry(entry.url, retries, workerSignal)
			} catch (error) {
				throw isAbortError(error) ? error : new PhotoDownloadError(entry.filename, error)
			}

			// add + final push run synchronously, so parallel downloads never interleave entries
			const file = new ZipPassThrough(entry.filename)
			zip.add(file)
			file.push(bytes, true)
			onProgress?.(++done, entries.length)
		},
		{ signal }
	)

	zip.end()

	const [zipError] = zipErrors

	if (zipError) {
		throw zipError
	}

	return new Blob(chunks, { type: 'application/zip' })
}
