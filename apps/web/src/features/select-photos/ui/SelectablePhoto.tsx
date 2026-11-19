import { memo } from 'react'

import { Box, Checkbox } from '@mantine/core'

import { ProductPhotoImage, type ProductPhoto } from '@/entities/product'

import classes from './SelectablePhoto.module.css'

interface SelectablePhotoProps {
	photo: ProductPhoto
	productName: string
	selected: boolean
	onToggle: (index: number) => void
}

/** Memoized: toggling one photo re-renders only that tile. */
export const SelectablePhoto = memo(function SelectablePhoto({
	photo,
	productName,
	selected,
	onToggle
}: SelectablePhotoProps) {
	return (
		<Box component='label' className={classes.tile} data-selected={selected || undefined}>
			<ProductPhotoImage photo={photo} productName={productName} />
			<Checkbox
				className={classes.checkbox}
				checked={selected}
				onChange={() => {
					onToggle(photo.index)
				}}
				aria-label={`Фото ${photo.index}`}
			/>
		</Box>
	)
})
