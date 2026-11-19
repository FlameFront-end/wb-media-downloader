import * as z from 'zod/mini'

const DEFAULT_WB_UPSTREAMS_URL = 'https://cdn.wbbasket.ru/api/v3/upstreams'

const envSchema = z.object({
	VITE_WB_UPSTREAMS_URL: z._default(
		z
			.url({ protocol: /^https?$/, error: 'Expected an absolute http(s) URL' })
			.check(z.refine(value => !value.endsWith('/'), 'Must not end with a trailing slash')),
		DEFAULT_WB_UPSTREAMS_URL
	)
})

export type Env = z.output<typeof envSchema>

export function parseEnv(raw: Record<string, unknown>): Env {
	const result = envSchema.safeParse(raw)

	if (!result.success) {
		throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`)
	}

	return result.data
}

export const env = parseEnv(import.meta.env)
