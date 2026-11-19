import { QueryClient } from '@tanstack/react-query'

import { isRetryableError } from '@/shared/api'

const MAX_RETRIES = 1

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60_000,
				retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryableError(error),
				refetchOnWindowFocus: false
			},
			mutations: {
				retry: 0
			}
		}
	})
}
