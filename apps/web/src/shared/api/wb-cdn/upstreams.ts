import * as z from 'zod/mini'

import { env } from '@/shared/config'

import { fetchJson } from '../http'

const hostnameSchema = z.string().check(z.regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, 'Invalid CDN hostname'))
const volSchema = z.int().check(z.nonnegative())

const hostRangeSchema = z.pipe(
	z
		.object({
			vol_range_from: volSchema,
			vol_range_to: volSchema,
			host: hostnameSchema
		})
		.check(
			z.refine(range => range.vol_range_from <= range.vol_range_to, 'vol_range_from must not exceed vol_range_to')
		),
	z.transform(range => ({ from: range.vol_range_from, to: range.vol_range_to, host: range.host }))
)

const rangeRouteMapSchema = z.pipe(
	z
		.array(z.object({ method: z.literal('range'), hosts: z.array(hostRangeSchema).check(z.minLength(1)) }))
		.check(z.minLength(1)),
	z.transform(routeMaps => routeMaps.flatMap(routeMap => routeMap.hosts))
)

export const upstreamsSchema = z.pipe(
	z.object({
		origin: z.object({
			mediabasket_route_map: rangeRouteMapSchema,
			videonme_route_map: rangeRouteMapSchema
		})
	}),
	z.transform(({ origin }) => ({
		mediaHosts: origin.mediabasket_route_map,
		videoHosts: origin.videonme_route_map
	}))
)

export type HostRange = z.output<typeof hostRangeSchema>
export type Upstreams = z.output<typeof upstreamsSchema>

export function getUpstreams(signal?: AbortSignal): Promise<Upstreams> {
	return fetchJson(env.VITE_WB_UPSTREAMS_URL, upstreamsSchema, { signal })
}
