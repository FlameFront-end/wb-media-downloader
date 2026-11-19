import type { VideoQuality } from '@/shared/api'

export interface ProductPhoto {
	/** 1-based index on WB CDN */
	index: number
	/** 246×328 — grid tile on 1x screens */
	thumbnailUrl: string
	/** 516×688 — grid tile on 2x screens */
	previewUrl: string
	/** Full-size original — goes into the archive */
	originalUrl: string
}

export interface ProductVideoSource {
	quality: VideoQuality
	playlistUrl: string
}

export interface ProductVideo {
	/** Ordered from best to worst quality */
	sources: ProductVideoSource[]
}

export interface Product {
	id: number
	name: string
	photos: ProductPhoto[]
	video: ProductVideo | null
}
