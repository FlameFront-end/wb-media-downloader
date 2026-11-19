import { queryOptions } from '@tanstack/react-query'

import { isRetryableError, wbCdnQueries } from '@/shared/api'

import { getProduct } from './get-product'

const MAX_RETRIES = 2

export const productQueries = {
	all: () => ['product'] as const,
	detail: (nm: number) =>
		queryOptions({
			queryKey: [...productQueries.all(), 'detail', nm] as const,
			queryFn: async ({ client, signal }) => {
				const upstreams = await client.query(wbCdnQueries.upstreams())

				return getProduct(nm, upstreams, signal)
			},
			staleTime: 5 * 60_000,
			retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryableError(error)
		})
}
