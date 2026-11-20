import { useCallback } from 'react'

import type { Product } from '@/entities/product'
import { useFileDownload } from '@/shared/lib'

import { downloadProductVideo } from '../lib/download-product-video'

export function useDownloadVideo(product: Product, active: boolean) {
	const { start, ...download } = useFileDownload(['download-video', product.id], active)

	const downloadVideo = useCallback(() => {
		// Resolve sources now: the cached card may change before a paused download runs
		const { id, video } = product

		if (!video) {
			return
		}

		const key = JSON.stringify([id, video.sources])
		start(key, async context => {
			const { quality, file } = await downloadProductVideo(video, context)

			return { file, filename: `wb-${id}-video-${quality}.mp4` }
		})
	}, [start, product])

	return { ...download, downloadVideo }
}
