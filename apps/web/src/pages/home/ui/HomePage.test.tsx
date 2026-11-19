import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../../../test/render'

import { HomePage } from './HomePage'

describe('HomePage', () => {
	it('renders app title', () => {
		renderWithProviders(<HomePage />)

		expect(screen.getByRole('heading', { name: 'WB Media Downloader' })).toBeInTheDocument()
	})
})
