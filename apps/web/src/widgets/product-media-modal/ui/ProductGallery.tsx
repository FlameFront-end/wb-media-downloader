import { useMemo, useState } from 'react'

import { Box, Checkbox, Group, Skeleton, Text, Title } from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'

import type { Product } from '@/entities/product'
import { DownloadPhotosButton } from '@/features/download-photos'
import { DownloadVideoButton } from '@/features/download-video'
import { SelectablePhoto, SelectAllPhotos, usePhotoSelection } from '@/features/select-photos'
import { DownloadControlSkeleton } from '@/shared/ui'

import { SKELETON_TILES } from './gallery-grid'
import { GalleryLayout } from './GalleryLayout'
import classes from './ProductGallery.module.css'

interface ProductGalleryProps {
	product?: Product
	active: boolean
	waitingForNetwork: boolean
}

export function ProductGallery({ product, active, waitingForNetwork }: ProductGalleryProps) {
	const isLoading = !product
	const animateSkeleton = !useReducedMotion(false, { getInitialValueInEffect: false })
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
			waitingForNetwork={isLoading && waitingForNetwork}
			title={
				isLoading ? (
					<Skeleton animate={animateSkeleton} width='60%'>
						<Title order={3} size='h4' aria-hidden>
							&nbsp;
						</Title>
					</Skeleton>
				) : (
					<Title order={3} size='h4' className={classes.productTitle} title={product.name}>
						{product.name}
					</Title>
				)
			}
			toolbar={
				isLoading ? (
					<Skeleton animate={animateSkeleton}>
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
						<DownloadControlSkeleton animate={animateSkeleton} />
						<DownloadControlSkeleton animate={animateSkeleton} />
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
						<Skeleton animate={animateSkeleton} w='100%' h='100%' radius='sm' />
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
