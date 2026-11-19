import { z } from 'zod'

const envSchema = z.object({
	VITE_PROXY_URL: z.string().trim().min(1).default('/api')
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(raw: Record<string, unknown>): Env {
	const result = envSchema.safeParse(raw)

	if (!result.success) {
		throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`)
	}

	return result.data
}

export const env = parseEnv(import.meta.env)
