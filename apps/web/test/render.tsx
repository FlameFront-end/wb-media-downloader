import type { ReactElement, ReactNode } from 'react'

import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'

function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			// retry stays as defined by query options; delays are dropped to keep tests fast
			queries: { retry: false, retryDelay: 0, gcTime: Infinity },
			mutations: { retry: false }
		}
	})
}

/**
 * Renders UI with the same providers as the app, but with a fresh QueryClient per test:
 * no retries by default (queries may override), no retry delay, Mantine in test env.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
	const queryClient = createTestQueryClient()

	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<MantineProvider env='test'>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</MantineProvider>
		)
	}

	return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) }
}
