import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from './AppProviders'

const state = { shouldThrow: true }

function Unstable() {
	if (state.shouldThrow) {
		throw new Error('Boom')
	}

	return <p>Recovered</p>
}

describe('AppProviders', () => {
	it('shows fallback on render error and recovers after retry', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const user = userEvent.setup()

		render(
			<AppProviders>
				<Unstable />
			</AppProviders>
		)

		expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument()

		state.shouldThrow = false
		await user.click(screen.getByRole('button', { name: 'Попробовать снова' }))

		expect(screen.getByText('Recovered')).toBeInTheDocument()
	})
})
