import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { KNOWN_NM } from '../../../../test/msw/fixtures/wb'
import { renderWithProviders } from '../../../../test/render'
import { loadProductMediaModal } from '../lib/load-product-media-modal'
import { reloadPage } from '../lib/reload-page'

import { HomePage } from './HomePage'

vi.mock('../lib/load-product-media-modal', () => ({
	loadProductMediaModal: vi.fn(),
	preloadProductMediaModal: vi.fn()
}))
vi.mock('../lib/reload-page', () => ({ reloadPage: vi.fn() }))

async function openArticle() {
	const user = userEvent.setup()
	renderWithProviders(<HomePage />)
	await user.type(screen.getByLabelText('Артикул или ссылка WB'), String(KNOWN_NM))
	await user.click(screen.getByRole('button', { name: 'Скачать фото' }))

	return user
}

const findLoadError = () => screen.findByRole('alert', { name: 'Не удалось загрузить галерею' })

describe('LazyProductMediaModal when the modal chunk fails to load', () => {
	beforeEach(() => {
		// React reports errors caught by the boundary to the console
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		vi.mocked(loadProductMediaModal).mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'))
	})

	it('shows the error inline, keeping the form usable', async () => {
		await openArticle()

		expect(await findLoadError()).toBeInTheDocument()
		expect(screen.getByLabelText('Артикул или ссылка WB')).toBeEnabled()
		expect(screen.queryByText('Что-то пошло не так')).not.toBeInTheDocument()
	})

	it('offers a page reload as the recovery', async () => {
		const user = await openArticle()

		await user.click(within(await findLoadError()).getByRole('button', { name: 'Перезагрузить страницу' }))

		expect(reloadPage).toHaveBeenCalledOnce()
	})

	it('can be dismissed and shows up again on the next submit', async () => {
		const user = await openArticle()

		await user.click(within(await findLoadError()).getByRole('button', { name: 'Закрыть' }))
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Скачать фото' }))
		expect(await findLoadError()).toBeInTheDocument()
	})
})
