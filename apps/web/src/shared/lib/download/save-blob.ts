/** Give the browser time to start reading the blob before the URL is revoked. */
const REVOKE_DELAY_MS = 60_000

export function saveBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')

	link.href = url
	link.download = filename
	link.rel = 'noopener'
	link.style.display = 'none'
	document.body.append(link)
	link.click()
	link.remove()

	setTimeout(() => {
		URL.revokeObjectURL(url)
	}, REVOKE_DELAY_MS)
}
