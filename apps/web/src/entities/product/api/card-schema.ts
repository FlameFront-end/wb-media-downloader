import * as z from 'zod/mini'

const MAX_PHOTOS_PER_CARD = 200

export const cardSchema = z.object({
	nm_id: z.int().check(z.positive()),
	imt_name: z.optional(
		z.pipe(
			z.string().check(z.trim()),
			z.transform(name => (name === '' ? undefined : name))
		)
	),
	media: z.optional(
		z.object({
			photo_count: z.int().check(z.nonnegative(), z.maximum(MAX_PHOTOS_PER_CARD)),
			has_video: z.optional(z.boolean())
		})
	)
})

export type CardDto = z.output<typeof cardSchema>
