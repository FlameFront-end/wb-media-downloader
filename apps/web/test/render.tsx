import type { ReactElement, ReactNode } from 'react'

import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'

function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false }
		}
	})
}

/**
 * Renders UI with the same providers as the app, but with a fresh,
 * non-retrying QueryClient per test.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
	const queryClient = createTestQueryClient()

	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<MantineProvider>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</MantineProvider>
		)
	}

	return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) }
}
