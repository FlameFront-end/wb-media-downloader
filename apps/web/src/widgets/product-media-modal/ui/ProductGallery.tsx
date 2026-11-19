import { useMemo } from 'react'

import { Text, Title } from '@mantine/core'

import type { Product } from '@/entities/product'
import { DownloadPhotosButton } from '@/features/download-photos'
import { DownloadVideoButton } from '@/features/download-video'
import { SelectablePhoto, SelectAllPhotos, usePhotoSelection } from '@/features/select-photos'

import { GalleryLayout } from './GalleryLayout'

interface ProductGalleryProps {
	product: Product
}

export function ProductGallery({ product }: ProductGalleryProps) {
	const indexes = useMemo(() => product.photos.map(photo => photo.index), [product.photos])
	const selection = usePhotoSelection(indexes)
	const hasPhotos = product.photos.length > 0

	return (
		<GalleryLayout
			title={
				<Title order={3} size='h4'>
					{product.name}
				</Title>
			}
			toolbar={hasPhotos && <SelectAllPhotos selection={selection} total={product.photos.length} />}
			grid={hasPhotos}
			footer={
				<>
					<DownloadPhotosButton product={product} selectedIndexes={selection.selectedIndexes} />
					<DownloadVideoButton product={product} align='end' />
				</>
			}
		>
			{hasPhotos ? (
				product.photos.map(photo => (
					<SelectablePhoto
						key={photo.index}
						photo={photo}
						productName={product.name}
						selected={selection.isSelected(photo.index)}
						onToggle={selection.toggle}
					/>
				))
			) : (
				<Text c='dimmed'>У товара нет фотографий</Text>
			)}
		</GalleryLayout>
	)
}
