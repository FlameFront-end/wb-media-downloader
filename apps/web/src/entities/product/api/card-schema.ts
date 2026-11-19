import { z } from 'zod'

export const cardSchema = z.object({
	nm_id: z.number().int().positive(),
	imt_name: z
		.string()
		.trim()
		.transform(name => (name === '' ? undefined : name))
		.optional(),
	media: z
		.object({
			photo_count: z.number().int().nonnegative(),
			has_video: z.boolean()
		})
		.optional()
})

export type CardDto = z.output<typeof cardSchema>
