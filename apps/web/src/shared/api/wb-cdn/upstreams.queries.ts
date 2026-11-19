import { queryOptions } from '@tanstack/react-query'

import { getUpstreams } from './upstreams'

export const wbCdnQueries = {
	all: () => ['wb-cdn'] as const,
	upstreams: () =>
		queryOptions({
			queryKey: [...wbCdnQueries.all(), 'upstreams'] as const,
			queryFn: ({ signal }) => getUpstreams(signal),
			staleTime: Infinity,
			gcTime: Infinity
		})
}
