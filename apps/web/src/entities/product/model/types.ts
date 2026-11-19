import type { VideoQuality } from '@/shared/api'

export interface ProductPhoto {
	/** 1-based index on WB CDN */
	index: number
	previewUrl: string
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
