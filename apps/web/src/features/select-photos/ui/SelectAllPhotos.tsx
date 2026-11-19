import { Checkbox, Group, Text } from '@mantine/core'

import type { PhotoSelection } from '../model/use-photo-selection'

interface SelectAllPhotosProps {
	selection: PhotoSelection
	total: number
}

export function SelectAllPhotos({ selection, total }: SelectAllPhotosProps) {
	return (
		<Group gap='sm'>
			<Checkbox
				label='Выбрать все'
				checked={selection.allSelected}
				indeterminate={selection.someSelected}
				onChange={selection.toggleAll}
			/>
			<Text size='sm' c='dimmed' aria-live='polite'>
				Выбрано {selection.selectedCount} из {total}
			</Text>
		</Group>
	)
}
