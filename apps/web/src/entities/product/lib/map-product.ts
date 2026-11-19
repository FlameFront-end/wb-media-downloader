import { buildPhotoUrl, buildVideoPlaylistUrl, VIDEO_QUALITIES, type Upstreams } from '@/shared/api'

import type { CardDto } from '../api/card-schema'
import type { Product, ProductPhoto, ProductVideoSource, ProductVideoState } from '../model/types'

const THUMBNAIL_SIZE = 'c246x328'
const PREVIEW_SIZE = 'c516x688'
const ORIGINAL_SIZE = 'big'

function mapPhotos(nm: number, photoCount: number, upstreams: Upstreams): ProductPhoto[] {
	const photos: ProductPhoto[] = []

	for (let index = 1; index <= photoCount; index++) {
		const thumbnailUrl = buildPhotoUrl(nm, upstreams.mediaHosts, THUMBNAIL_SIZE, index)
		const previewUrl = buildPhotoUrl(nm, upstreams.mediaHosts, PREVIEW_SIZE, index)
		const originalUrl = buildPhotoUrl(nm, upstreams.mediaHosts, ORIGINAL_SIZE, index)

		if (thumbnailUrl && previewUrl && originalUrl) {
			photos.push({ index, thumbnailUrl, previewUrl, originalUrl })
		}
	}

	return photos
}

function mapVideo(nm: number, hasVideo: boolean | undefined, upstreams: Upstreams): ProductVideoState {
	if (hasVideo === undefined) {
		return { videoAvailability: 'unknown', video: null }
	}
	if (!hasVideo) {
		return { videoAvailability: 'absent', video: null }
	}

	const sources = VIDEO_QUALITIES.flatMap((quality): ProductVideoSource[] => {
		const playlistUrl = buildVideoPlaylistUrl(nm, upstreams.videoHosts, quality)

		return playlistUrl ? [{ quality, playlistUrl }] : []
	})

	return sources.length > 0
		? { videoAvailability: 'available', video: { sources } }
		: { videoAvailability: 'unavailable', video: null }
}

export function mapProduct(card: CardDto, upstreams: Upstreams): Product {
	const nm = card.nm_id

	return {
		id: nm,
		name: card.imt_name ?? `Товар ${nm}`,
		photos: mapPhotos(nm, card.media?.photo_count ?? 0, upstreams),
		...mapVideo(nm, card.media?.has_video, upstreams)
	}
}
