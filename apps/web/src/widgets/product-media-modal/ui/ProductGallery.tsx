import { useMemo } from 'react'

import { SimpleGrid, Stack, Text, Title } from '@mantine/core'

import type { Product } from '@/entities/product'
import { SelectablePhoto, SelectAllPhotos, usePhotoSelection } from '@/features/select-photos'

interface ProductGalleryProps {
	product: Product
}

export function ProductGallery({ product }: ProductGalleryProps) {
	const indexes = useMemo(() => product.photos.map(photo => photo.index), [product.photos])
	const selection = usePhotoSelection(indexes)

	return (
		<Stack gap='md'>
			<Title order={3} size='h4'>
				{product.name}
			</Title>

			{product.photos.length === 0 ? (
				<Text c='dimmed'>У товара нет фотографий</Text>
			) : (
				<>
					<SelectAllPhotos selection={selection} total={product.photos.length} />
					<SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing='sm'>
						{product.photos.map(photo => (
							<SelectablePhoto
								key={photo.index}
								photo={photo}
								productName={product.name}
								selected={selection.isSelected(photo.index)}
								onToggle={selection.toggle}
							/>
						))}
					</SimpleGrid>
				</>
			)}
		</Stack>
	)
}
