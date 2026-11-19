import { vi } from 'vitest'

export interface CapturedDownload {
	filename: string
	blob: Blob
}

/**
 * Intercepts `saveBlob` at the browser boundary (object URL + link click)
 * and records what would have been saved.
 */
export function captureDownloads(): CapturedDownload[] {
	const downloads: CapturedDownload[] = []
	const blobs = new Map<string, Blob>()
	let counter = 0

	vi.spyOn(URL, 'createObjectURL').mockImplementation(object => {
		const url = `blob:test/${++counter}`
		blobs.set(url, object as Blob)
		return url
	})
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
		const blob = blobs.get(this.href)

		if (blob) {
			downloads.push({ filename: this.download, blob })
		}
	})

	return downloads
}

export async function blobBytes(blob: Blob): Promise<Uint8Array> {
	return new Uint8Array(await blob.arrayBuffer())
}

/** Waits until exactly one file was saved and returns it. */
export async function waitForSingleDownload(downloads: CapturedDownload[]): Promise<CapturedDownload> {
	const { waitFor } = await import('@testing-library/react')

	return waitFor(() => {
		const [download, ...rest] = downloads

		if (!download || rest.length > 0) {
			throw new Error(`Expected exactly one download, got ${downloads.length}`)
		}

		return download
	})
}
