import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { KNOWN_NM } from '../../../../test/msw/fixtures/wb'
import { renderWithProviders } from '../../../../test/render'
import { loadProductMediaModal } from '../lib/load-product-media-modal'

import { HomePage } from './HomePage'

// Own file: React.lazy in LazyProductMediaModal is module-level, a rejected load
// from another test would stay cached for this one
vi.mock('../lib/load-product-media-modal', () => ({
	loadProductMediaModal: vi.fn(),
	preloadProductMediaModal: vi.fn()
}))

describe('HomePage while the modal chunk is still loading', () => {
	it('spins the submit button, then opens the modal', async () => {
		const modalModule = await vi.importActual<Awaited<ReturnType<typeof loadProductMediaModal>>>(
			'@/widgets/product-media-modal'
		)
		let resolveChunk!: () => void
		const chunk = new Promise<void>(resolve => {
			resolveChunk = resolve
		})
		vi.mocked(loadProductMediaModal).mockImplementation(async () => {
			await chunk
			return modalModule
		})
		const user = userEvent.setup()
		renderWithProviders(<HomePage />)

		await user.type(screen.getByLabelText('Артикул'), String(KNOWN_NM))
		await user.click(screen.getByRole('button', { name: 'Скачать фото' }))

		const submit = screen.getByRole('button', { name: 'Скачать фото' })
		expect(submit).toHaveAttribute('data-loading')
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		resolveChunk()

		expect(await screen.findByRole('dialog')).toBeInTheDocument()
		expect(submit).not.toHaveAttribute('data-loading')
	})
})
