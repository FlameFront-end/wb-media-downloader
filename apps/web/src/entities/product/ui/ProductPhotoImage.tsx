import { AspectRatio, Image } from '@mantine/core'

import type { ProductPhoto } from '../model/types'

interface ProductPhotoImageProps {
	photo: ProductPhoto
	productName: string
}

/** WB card photos are 3:4. Preview size keeps the grid light; originals go to the archive. */
export function ProductPhotoImage({ photo, productName }: ProductPhotoImageProps) {
	return (
		<AspectRatio ratio={3 / 4}>
			<Image
				src={photo.previewUrl}
				alt={`${productName} — фото ${photo.index}`}
				loading='lazy'
				decoding='async'
				radius='sm'
				fit='cover'
			/>
		</AspectRatio>
	)
}
