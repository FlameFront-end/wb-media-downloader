import { Button, Group, Progress, Stack, Text } from '@mantine/core'

import type { Product } from '@/entities/product'

import { PhotoDownloadError } from '../lib/create-photos-zip'
import { useDownloadPhotos } from '../model/use-download-photos'

interface DownloadPhotosButtonProps {
	product: Product
	selectedIndexes: readonly number[]
}

export function DownloadPhotosButton({ product, selectedIndexes }: DownloadPhotosButtonProps) {
	const { download, cancel, progress, isPending, isPaused, error } = useDownloadPhotos(product)
	const count = selectedIndexes.length

	return (
		<Stack gap={6}>
			<Group gap='xs'>
				<Button
					loading={isPending}
					disabled={count === 0}
					onClick={() => {
						download(selectedIndexes)
					}}
				>
					Скачать фото{count > 0 ? ` (${count})` : ''}
				</Button>
				{isPending && (
					<Button variant='subtle' color='gray' onClick={cancel}>
						Отмена
					</Button>
				)}
			</Group>

			{isPaused && (
				<Text size='xs' c='dimmed' aria-live='polite'>
					Нет сети — загрузка начнётся после подключения
				</Text>
			)}

			{progress && (
				<Stack gap={4} aria-live='polite'>
					<Progress
						value={progress.total === 0 ? 0 : (progress.done / progress.total) * 100}
						size='sm'
						aria-label='Прогресс скачивания фото'
					/>
					<Text size='xs' c='dimmed'>
						Загружено {progress.done} из {progress.total}
					</Text>
				</Stack>
			)}

			{error && (
				<Text size='sm' c='red' role='alert'>
					{error instanceof PhotoDownloadError
						? `Не удалось скачать ${error.filename}. Попробуйте ещё раз.`
						: 'Не удалось собрать архив. Попробуйте ещё раз.'}
				</Text>
			)}
		</Stack>
	)
}
