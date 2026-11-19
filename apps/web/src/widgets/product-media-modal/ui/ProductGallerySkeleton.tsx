import { Skeleton, Title } from '@mantine/core'

import { GalleryLayout } from './GalleryLayout'

const SKELETON_TILES = 8
/** Same height as the select-all checkbox row. */
const TOOLBAR_HEIGHT = 20
/** Same height as a default Mantine button. */
const BUTTON_HEIGHT = 36

export function ProductGallerySkeleton() {
	return (
		<GalleryLayout
			loading
			title={
				// Wraps a real title, so the placeholder takes exactly one title line
				<Skeleton width='60%'>
					<Title order={3} size='h4' aria-hidden>
						&nbsp;
					</Title>
				</Skeleton>
			}
			toolbar={<Skeleton height={TOOLBAR_HEIGHT} width={200} />}
			footer={
				<>
					<Skeleton height={BUTTON_HEIGHT} width={150} />
					<Skeleton height={BUTTON_HEIGHT} width={140} ml='auto' />
				</>
			}
		>
			{Array.from({ length: SKELETON_TILES }, (_, index) => (
				<Skeleton
					key={index}
					radius='sm'
					style={{ aspectRatio: '3 / 4' }}
					data-testid='gallery-tile-skeleton'
				/>
			))}
		</GalleryLayout>
	)
}
