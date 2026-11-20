import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { cardFixture, KNOWN_NM, MISSING_NM } from '../../../../../test/msw/fixtures/wb'
import { server } from '../../../../../test/msw/server'
import { renderWithProviders } from '../../../../../test/render'

import { ProductMediaModal } from './ProductMediaModal'

const CARD_URL = 'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/info/ru/card.json'

function renderModal(productId: number | null) {
	return renderWithProviders(<ProductMediaModal productId={productId} onClose={() => undefined} />)
}

describe('ProductMediaModal', () => {
	it('renders nothing when closed', () => {
		renderModal(null)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it.each([
		['phone', true],
		['wider screen', false]
	])('takes the full screen only on a %s', async (_, isPhone) => {
		vi.spyOn(window, 'matchMedia').mockImplementation(query =>
			Object.assign(new EventTarget(), {
				media: query,
				matches: isPhone && query === '(max-width: 36em)',
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn()
			})
		)
		renderModal(KNOWN_NM)

		const dialog = await screen.findByRole('dialog')
		expect(dialog.hasAttribute('data-full-screen')).toBe(isPhone)
	})

	it('shows skeleton while loading', async () => {
		renderModal(KNOWN_NM)

		expect(await screen.findByLabelText('Загрузка карточки')).toHaveAttribute('aria-busy', 'true')
		expect(await screen.findByRole('heading', { name: cardFixture.imt_name })).toBeInTheDocument()
	})

	it('renders previews with all photos selected by default', async () => {
		renderModal(KNOWN_NM)

		const checkboxes = await screen.findAllByRole('checkbox', { name: /^Фото \d+$/ })
		expect(checkboxes).toHaveLength(cardFixture.media.photo_count)
		checkboxes.forEach(checkbox => {
			expect(checkbox).toBeChecked()
		})
		expect(screen.getByRole('checkbox', { name: 'Выбрать все' })).toBeChecked()
		expect(screen.getByText('Выбрано 3 из 3')).toBeInTheDocument()

		const [firstImage] = screen.getAllByRole('img')
		expect(firstImage).toHaveAttribute(
			'src',
			'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/c516x688/1.webp'
		)
		expect(firstImage).toHaveAttribute(
			'srcset',
			'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/c246x328/1.webp 246w, https://basket-30.wbbasket.ru/vol6041/part604174/604174866/images/c516x688/1.webp 516w'
		)
		expect(firstImage).toHaveAttribute('sizes')
		expect(firstImage).toHaveAttribute('loading', 'lazy')
	})

	it('toggles single photo and select all', async () => {
		const user = userEvent.setup()
		renderModal(KNOWN_NM)

		await user.click(await screen.findByRole('checkbox', { name: 'Фото 2' }))

		expect(screen.getByRole('checkbox', { name: 'Фото 2' })).not.toBeChecked()
		expect(screen.getByText('Выбрано 2 из 3')).toBeInTheDocument()
		const selectAll = screen.getByRole('checkbox', { name: 'Выбрать все' })
		expect(selectAll).not.toBeChecked()
		expect(selectAll).toHaveAttribute('data-indeterminate', 'true')

		await user.click(selectAll)
		expect(screen.getByText('Выбрано 3 из 3')).toBeInTheDocument()

		await user.click(selectAll)
		expect(screen.getByText('Выбрано 0 из 3')).toBeInTheDocument()
		screen.getAllByRole('checkbox', { name: /^Фото \d+$/ }).forEach(checkbox => {
			expect(checkbox).not.toBeChecked()
		})
	})

	it('shows not found message for missing product', async () => {
		renderModal(MISSING_NM)

		expect(await screen.findByText('Товар не найден')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument()
	})

	it('shows error with retry and recovers', async () => {
		const network = { failing: true }
		server.use(
			http.get(CARD_URL, () =>
				network.failing ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(cardFixture)
			)
		)
		const user = userEvent.setup()
		renderModal(KNOWN_NM)

		const alert = await screen.findByRole('alert')
		expect(within(alert).getByText('Не удалось загрузить карточку')).toBeInTheDocument()
		// 503 is the CDN, not the user's connection
		expect(alert).toHaveTextContent('Серверы Wildberries сейчас не отвечают')

		network.failing = false
		await user.click(within(alert).getByRole('button', { name: 'Повторить' }))

		expect(await screen.findByRole('heading', { name: cardFixture.imt_name })).toBeInTheDocument()
	})

	it('retries from the error screen with a loader in the button instead of the skeleton', async () => {
		let failing = true
		let release!: () => void
		const released = new Promise<void>(resolve => {
			release = resolve
		})
		server.use(
			http.get(CARD_URL, async () => {
				if (failing) {
					return new HttpResponse(null, { status: 503 })
				}
				await released
				return HttpResponse.json(cardFixture)
			})
		)
		const user = userEvent.setup()
		renderModal(KNOWN_NM)

		const alert = await screen.findByRole('alert')
		failing = false
		await user.click(within(alert).getByRole('button', { name: 'Повторить' }))

		expect(within(screen.getByRole('alert')).getByRole('button', { name: 'Повторить' })).toHaveAttribute(
			'data-loading'
		)
		expect(screen.queryByLabelText('Загрузка карточки')).not.toBeInTheDocument()

		release()
		expect(await screen.findByRole('heading', { name: cardFixture.imt_name })).toBeInTheDocument()
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})

	it('shows empty state for product without photos', async () => {
		server.use(
			http.get(CARD_URL, () => HttpResponse.json({ ...cardFixture, media: { photo_count: 0, has_video: false } }))
		)
		renderModal(KNOWN_NM)

		expect(await screen.findByText('У товара нет фотографий')).toBeInTheDocument()
		expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
	})

	it('updates selection when photos of the same product change', async () => {
		const user = userEvent.setup()
		const { queryClient } = renderModal(KNOWN_NM)

		await user.click(await screen.findByRole('checkbox', { name: 'Фото 1' }))
		expect(screen.getByText('Выбрано 2 из 3')).toBeInTheDocument()

		server.use(
			http.get(CARD_URL, () =>
				HttpResponse.json({ ...cardFixture, media: { ...cardFixture.media, photo_count: 2 } })
			)
		)
		await act(() => queryClient.refetchQueries())

		expect(await screen.findByText('Выбрано 1 из 2')).toBeInTheDocument()
		expect(screen.getByRole('checkbox', { name: 'Фото 1' })).not.toBeChecked()
		expect(screen.getByRole('checkbox', { name: 'Фото 2' })).toBeChecked()
		expect(screen.queryByRole('checkbox', { name: 'Фото 3' })).not.toBeInTheDocument()
	})

	it('keeps gallery and selection when background refetch fails', async () => {
		const user = userEvent.setup()
		const { queryClient } = renderModal(KNOWN_NM)

		await user.click(await screen.findByRole('checkbox', { name: 'Фото 1' }))

		const network = { failing: true }
		server.use(
			http.get(CARD_URL, () =>
				network.failing ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(cardFixture)
			)
		)
		await act(() => queryClient.refetchQueries())

		const alert = await screen.findByRole('alert')
		expect(within(alert).getByText('Не удалось обновить карточку')).toBeInTheDocument()
		expect(screen.getByRole('checkbox', { name: 'Фото 1' })).not.toBeChecked()
		expect(screen.getByText('Выбрано 2 из 3')).toBeInTheDocument()

		network.failing = false
		await user.click(within(alert).getByRole('button', { name: 'Повторить' }))

		await waitFor(() => {
			expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		})
		expect(screen.getByRole('checkbox', { name: 'Фото 1' })).not.toBeChecked()
		expect(screen.getByText('Выбрано 2 из 3')).toBeInTheDocument()
	})

	it('selects a photo that disappeared and came back after refetches', async () => {
		const user = userEvent.setup()
		const { queryClient } = renderModal(KNOWN_NM)
		const withPhotos = (photoCount: number) =>
			http.get(CARD_URL, () =>
				HttpResponse.json({ ...cardFixture, media: { ...cardFixture.media, photo_count: photoCount } })
			)

		await user.click(await screen.findByRole('checkbox', { name: 'Фото 3' }))
		expect(screen.getByText('Выбрано 2 из 3')).toBeInTheDocument()

		server.use(withPhotos(2))
		await act(() => queryClient.refetchQueries())
		expect(await screen.findByText('Выбрано 2 из 2')).toBeInTheDocument()

		server.use(withPhotos(3))
		await act(() => queryClient.refetchQueries())

		expect(await screen.findByText('Выбрано 3 из 3')).toBeInTheDocument()
		expect(screen.getByRole('checkbox', { name: 'Фото 3' })).toBeChecked()
	})

	it('resets selection when product changes', async () => {
		const user = userEvent.setup()
		const otherNm = KNOWN_NM + 1000
		server.use(
			http.get(/\/604175866\/info\/ru\/card\.json$/, () =>
				HttpResponse.json({ ...cardFixture, nm_id: otherNm, imt_name: 'Другой товар' })
			)
		)
		const { rerender } = renderModal(KNOWN_NM)

		await user.click(await screen.findByRole('checkbox', { name: 'Фото 1' }))
		expect(screen.getByText('Выбрано 2 из 3')).toBeInTheDocument()

		rerender(<ProductMediaModal productId={otherNm} onClose={() => undefined} />)

		expect(await screen.findByRole('heading', { name: 'Другой товар' })).toBeInTheDocument()
		expect(screen.getByText('Выбрано 3 из 3')).toBeInTheDocument()
	})
})
