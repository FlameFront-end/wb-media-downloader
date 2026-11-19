import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { cardFixture, KNOWN_NM } from '../../../../test/msw/fixtures/wb'
import { renderWithProviders } from '../../../../test/render'

import { HomePage } from './HomePage'

function setup() {
	const user = userEvent.setup()
	renderWithProviders(<HomePage />)

	return {
		user,
		input: screen.getByLabelText('Артикул или ссылка WB'),
		submit: screen.getByRole('button', { name: 'Найти товар' })
	}
}

describe('HomePage', () => {
	it('renders app title and form', () => {
		setup()

		expect(screen.getByRole('heading', { name: 'WB Media Downloader' })).toBeInTheDocument()
	})

	it('shows validation error and does not open modal for invalid article', async () => {
		const { user, input, submit } = setup()

		await user.type(input, 'abc')
		await user.click(submit)

		expect(screen.getByText('Артикул — это число или ссылка на товар WB')).toBeInTheDocument()
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('clears validation error on input change', async () => {
		const { user, input, submit } = setup()

		await user.click(submit)
		expect(screen.getByText('Введите артикул')).toBeInTheDocument()

		await user.type(input, '1')
		expect(screen.queryByText('Введите артикул')).not.toBeInTheDocument()
	})

	it('opens modal with product photos for article from a WB link', async () => {
		const { user, input, submit } = setup()

		await user.type(input, `https://www.wildberries.ru/catalog/${KNOWN_NM}/detail.aspx`)
		await user.click(submit)

		const dialog = await screen.findByRole('dialog')
		expect(await within(dialog).findByRole('heading', { name: cardFixture.imt_name })).toBeInTheDocument()
		expect(within(dialog).getAllByRole('checkbox', { name: /^Фото \d+$/ })).toHaveLength(
			cardFixture.media.photo_count
		)
	})

	it('closes modal', async () => {
		const { user, input, submit } = setup()

		await user.type(input, String(KNOWN_NM))
		await user.click(submit)
		await screen.findByRole('dialog')
		await user.keyboard('{Escape}')

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})
