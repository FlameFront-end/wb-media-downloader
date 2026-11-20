import { useState, type ReactNode } from 'react'

import { MantineProvider } from '@mantine/core'
import { QueryClientProvider, QueryErrorResetBoundary } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ErrorBoundary } from 'react-error-boundary'

import { ErrorFallback } from '@/shared/ui'

import { createQueryClient } from '../query/query-client'
import { DEFAULT_MANTINE_COLOR_SCHEME } from '../styles/color-scheme/color-scheme'
import { theme } from '../styles/theme'

interface AppProvidersProps {
	children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
	const [queryClient] = useState(createQueryClient)

	return (
		<MantineProvider theme={theme} defaultColorScheme={DEFAULT_MANTINE_COLOR_SCHEME}>
			<QueryClientProvider client={queryClient}>
				<QueryErrorResetBoundary>
					{({ reset }) => (
						<ErrorBoundary FallbackComponent={ErrorFallback} onReset={reset}>
							{children}
						</ErrorBoundary>
					)}
				</QueryErrorResetBoundary>
				<ReactQueryDevtools buttonPosition='bottom-left' />
			</QueryClientProvider>
		</MantineProvider>
	)
}
