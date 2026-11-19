import { afterEach, describe, expect, it, vi } from 'vitest'

const chunk = vi.hoisted(() => ({ fail: true }))

vi.mock('@/widgets/product-media-modal', async importOriginal => {
	if (chunk.fail) throw new TypeError('Failed to fetch dynamically imported module')

	return importOriginal()
})

describe('loadProductMediaModal', () => {
	afterEach(() => {
		vi.resetModules()
		chunk.fail = true
	})

	it('does not memoize a failed import', async () => {
		const { loadProductMediaModal } = await import('./load-product-media-modal')

		await expect(loadProductMediaModal()).rejects.toThrow()

		chunk.fail = false
		await expect(loadProductMediaModal()).resolves.toHaveProperty('ProductMediaModal')
	})

	it('reuses a successful import', async () => {
		chunk.fail = false
		const { loadProductMediaModal } = await import('./load-product-media-modal')

		expect(loadProductMediaModal()).toBe(loadProductMediaModal())
		await expect(loadProductMediaModal()).resolves.toHaveProperty('ProductMediaModal')
	})

	it('swallows preload failures', async () => {
		const { preloadProductMediaModal } = await import('./load-product-media-modal')
		const unhandled = vi.fn()
		process.on('unhandledRejection', unhandled)

		try {
			preloadProductMediaModal()
			await new Promise(resolve => setTimeout(resolve, 0))
			expect(unhandled).not.toHaveBeenCalled()
		} finally {
			process.off('unhandledRejection', unhandled)
		}
	})
})
