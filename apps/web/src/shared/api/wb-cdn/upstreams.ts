import { z } from 'zod'

import { env } from '@/shared/config'

import { fetchJson } from '../http'

const hostnameSchema = z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, 'Invalid CDN hostname')

const hostRangeSchema = z
	.object({
		vol_range_from: z.number().int().nonnegative(),
		vol_range_to: z.number().int().nonnegative(),
		host: hostnameSchema
	})
	.refine(range => range.vol_range_from <= range.vol_range_to, 'vol_range_from must not exceed vol_range_to')
	.transform(range => ({ from: range.vol_range_from, to: range.vol_range_to, host: range.host }))

const rangeRouteMapSchema = z
	.array(z.object({ method: z.literal('range'), hosts: z.array(hostRangeSchema).min(1) }))
	.min(1)
	.transform(routeMaps => routeMaps.flatMap(routeMap => routeMap.hosts))

export const upstreamsSchema = z
	.object({
		origin: z.object({
			mediabasket_route_map: rangeRouteMapSchema,
			videonme_route_map: rangeRouteMapSchema
		})
	})
	.transform(({ origin }) => ({
		mediaHosts: origin.mediabasket_route_map,
		videoHosts: origin.videonme_route_map
	}))

export type HostRange = z.output<typeof hostRangeSchema>
export type Upstreams = z.output<typeof upstreamsSchema>

export function getUpstreams(signal?: AbortSignal): Promise<Upstreams> {
	return fetchJson(env.VITE_WB_UPSTREAMS_URL, upstreamsSchema, { signal })
}
