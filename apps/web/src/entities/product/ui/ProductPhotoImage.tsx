import { useState } from 'react'

import { AspectRatio, Image } from '@mantine/core'

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
	// Fade in once decoded instead of painting top to bottom; a failed preview keeps the placeholder
	const [loaded, setLoaded] = useState(false)

	return (
		<AspectRatio ratio={3 / 4} className={classes.frame}>
			<Image
				className={classes.image}
				data-loaded={loaded || undefined}
				onLoad={() => {
					setLoaded(true)
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
		</AspectRatio>
	)
}
