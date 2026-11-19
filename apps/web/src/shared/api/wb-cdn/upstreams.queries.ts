import { queryOptions } from '@tanstack/react-query'

import { getUpstreams } from './upstreams'

export const wbCdnQueries = {
	all: () => ['wb-cdn'] as const,
	upstreams: () =>
		queryOptions({
			queryKey: [...wbCdnQueries.all(), 'upstreams'] as const,
			queryFn: ({ signal }) => getUpstreams(signal),
			// The enclosing card query owns retries for this dependency.
			retry: false,
			staleTime: 10 * 60_000,
			gcTime: 30 * 60_000
		})
}
