import { useState } from 'react'

import { AspectRatio, Image, Text } from '@mantine/core'

import type { ProductPhoto } from '../model/types'

import classes from './ProductPhotoImage.module.css'

interface ProductPhotoImageProps {
	photo: ProductPhoto
	productName: string
}

/**
 * Grid tile width: 4 columns of the xl modal (~180px) from 48em, 3 columns from 36em, 2 below.
 * Keep in sync with the gallery grid.
 */
const TILE_SIZES = '(min-width: 48em) 180px, (min-width: 36em) 30vw, 45vw'

/**
 * WB card photos are 3:4. The browser picks 246w or 516w by tile width and pixel density,
 * so a 1x screen never downloads the larger preview; originals go to the archive only.
 */
export function ProductPhotoImage({ photo, productName }: ProductPhotoImageProps) {
	// Keep the tile dimensions stable across loading and failure.
	const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading')

	return (
		<AspectRatio ratio={3 / 4} className={classes.frame}>
			{status === 'failed' ? (
				<div className={classes.unavailable}>
					<Text size='xs' ta='center'>
						Превью недоступно
					</Text>
				</div>
			) : (
				<Image
					className={classes.image}
					data-loaded={status === 'loaded' || undefined}
					onLoad={() => {
						setStatus('loaded')
					}}
					onError={() => {
						setStatus('failed')
					}}
					src={photo.previewUrl}
					srcSet={`${photo.thumbnailUrl} 246w, ${photo.previewUrl} 516w`}
					sizes={TILE_SIZES}
					alt={`${productName} — фото ${photo.index}`}
					loading='lazy'
					decoding='async'
					radius='sm'
					fit='cover'
				/>
			)}
		</AspectRatio>
	)
}
