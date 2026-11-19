import { buildCardInfoUrl, fetchJson, HttpError, InvalidResponseError, type Upstreams } from '@/shared/api'

import { mapProduct } from '../lib/map-product'
import { ProductNotFoundError } from '../model/errors'
import type { Product } from '../model/types'

import { cardSchema } from './card-schema'

export async function getProduct(nm: number, upstreams: Upstreams, signal?: AbortSignal): Promise<Product> {
	if (!Number.isSafeInteger(nm) || nm <= 0) {
		throw new ProductNotFoundError(nm)
	}

	const url = buildCardInfoUrl(nm, upstreams.mediaHosts)

	if (!url) {
		throw new ProductNotFoundError(nm)
	}

	let card

	try {
		card = await fetchJson(url, cardSchema, { signal })
	} catch (error) {
		if (error instanceof HttpError && error.status === 404) {
			throw new ProductNotFoundError(nm)
		}

		throw error
	}

	if (card.nm_id !== nm) {
		throw new InvalidResponseError(url, `expected nm_id ${nm}, got ${card.nm_id}`)
	}

	return mapProduct(card, upstreams)
}
