import { Button, Group, Progress, Stack, Text } from '@mantine/core'

import type { Product } from '@/entities/product'
import { InvalidSegmentError, UnsupportedPlaylistError } from '@/shared/lib'

import { VideoUnavailableError } from '../lib/download-product-video'
import { useDownloadVideo } from '../model/use-download-video'

interface DownloadVideoButtonProps {
	product: Product
}

function errorMessage(error: Error): string {
	if (error instanceof VideoUnavailableError) {
		return 'Видео недоступно на CDN.'
	}

	if (error instanceof InvalidSegmentError) {
		return 'Видео на CDN повреждено, файл не сохранён.'
	}

	if (error instanceof UnsupportedPlaylistError) {
		return 'Формат видео не поддерживается.'
	}

	return 'Не удалось скачать видео. Попробуйте ещё раз.'
}

export function DownloadVideoButton({ product }: DownloadVideoButtonProps) {
	const { download, cancel, progress, isPending, isPaused, error } = useDownloadVideo(product)

	if (!product.video) {
		return (
			<Stack gap={6}>
				<Button variant='default' disabled>
					Скачать видео
				</Button>
				<Text size='xs' c='dimmed'>
					У товара нет видео
				</Text>
			</Stack>
		)
	}

	return (
		<Stack gap={6}>
			<Group gap='xs'>
				<Button variant='light' loading={isPending} onClick={download}>
					Скачать видео
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
						aria-label='Прогресс скачивания видео'
					/>
					<Text size='xs' c='dimmed'>
						Сегментов {progress.done} из {progress.total}
					</Text>
				</Stack>
			)}

			{error && (
				<Text size='sm' c='red' role='alert'>
					{errorMessage(error)}
				</Text>
			)}
		</Stack>
	)
}
