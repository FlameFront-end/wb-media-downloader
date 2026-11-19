import type * as ProductMediaModalModule from '@/widgets/product-media-modal'

let pending: Promise<typeof ProductMediaModalModule> | null = null

/**
 * Loads the modal chunk once. A failed import is not memoized,
 * so the next call starts a new request instead of replaying the error.
 */
export function loadProductMediaModal(): Promise<typeof ProductMediaModalModule> {
	pending ??= import('@/widgets/product-media-modal').catch((error: unknown) => {
		pending = null
		throw error
	})

	return pending
}

/** Best-effort warm-up: a failure here is reported when the user actually opens the modal. */
export function preloadProductMediaModal(): void {
	loadProductMediaModal().catch(() => undefined)
}
