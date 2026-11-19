import { useMemo, useState } from 'react'

import { Box, Checkbox, Group, Skeleton, Text, Title } from '@mantine/core'

import type { Product } from '@/entities/product'
import { DownloadPhotosButton } from '@/features/download-photos'
import { DownloadVideoButton } from '@/features/download-video'
import { SelectablePhoto, SelectAllPhotos, usePhotoSelection } from '@/features/select-photos'

import { SKELETON_TILES } from './gallery-grid'
import { GalleryLayout } from './GalleryLayout'
import classes from './ProductGallery.module.css'

/** Same height as a default Mantine button. */
const BUTTON_HEIGHT = 36

interface ProductGalleryProps {
	product?: Product
	active: boolean
}

export function ProductGallery({ product, active }: ProductGalleryProps) {
	const isLoading = !product
	// A gallery instance is tied to one opening: once loaded, it keeps its cached product.
	const [openedWithSkeleton] = useState(isLoading)
	const contentAppear = !isLoading && openedWithSkeleton
	const indexes = useMemo(() => product?.photos.map(photo => photo.index) ?? [], [product?.photos])
	const selection = usePhotoSelection(indexes)
	const hasPhotos = (product?.photos.length ?? 0) > 0

	return (
		<GalleryLayout
			loading={isLoading}
			contentAppear={contentAppear}
			title={
				isLoading ? (
					<Skeleton width='60%'>
						<Title order={3} size='h4' aria-hidden>
							&nbsp;
						</Title>
					</Skeleton>
				) : (
					<Title order={3} size='h4' lineClamp={2}>
						{product.name}
					</Title>
				)
			}
			toolbar={
				isLoading ? (
					<Skeleton>
						<Group gap='sm' aria-hidden>
							<Checkbox label='Выбрать все' disabled tabIndex={-1} />
							<Text size='sm' c='dimmed'>
								Выбрано 0 из 0
							</Text>
						</Group>
					</Skeleton>
				) : (
					hasPhotos && <SelectAllPhotos selection={selection} total={product.photos.length} />
				)
			}
			grid={isLoading || hasPhotos}
			footer={
				isLoading ? (
					<>
						<Skeleton height={BUTTON_HEIGHT} width={150} />
						<Skeleton height={BUTTON_HEIGHT} width={140} className={classes.videoPlaceholder} />
					</>
				) : (
					<>
						<DownloadPhotosButton
							product={product}
							active={active}
							selectedIndexes={selection.selectedIndexes}
						/>
						<DownloadVideoButton product={product} active={active} />
					</>
				)
			}
		>
			{isLoading ? (
				Array.from({ length: SKELETON_TILES }, (_, index) => (
					<Box
						key={index}
						w='100%'
						className={classes.skeletonTile}
						data-testid={index === 0 ? 'gallery-tile-skeleton' : undefined}
					>
						<Skeleton w='100%' h='100%' radius='sm' />
					</Box>
				))
			) : hasPhotos ? (
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
