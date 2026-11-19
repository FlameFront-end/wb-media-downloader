import { useCallback } from 'react'

import type { Product } from '@/entities/product'
import { useFileDownload } from '@/shared/lib'

import { createPhotosZip } from '../lib/create-photos-zip'

export function photoFilename(productId: number, index: number): string {
	return `wb-${productId}-${String(index).padStart(2, '0')}.webp`
}

export function useDownloadPhotos(product: Product) {
	const { start, ...download } = useFileDownload(['download-photos', product.id])

	const downloadPhotos = useCallback(
		(indexes: readonly number[]) => {
			// Resolve files now: the cached card may change before a paused download runs
			const wanted = new Set(indexes)
			const entries = product.photos
				.filter(photo => wanted.has(photo.index))
				.map(photo => ({ url: photo.originalUrl, filename: photoFilename(product.id, photo.index) }))

			if (entries.length === 0) {
				return
			}

			const filename = `wb-${product.id}-photos.zip`
			start(async context => ({ file: await createPhotosZip(entries, context), filename }))
		},
		[start, product]
	)

	return { ...download, downloadPhotos }
}
