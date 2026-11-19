import type { Product } from '@/entities/product'
import { InvalidSegmentError, UnsupportedPlaylistError } from '@/shared/lib'
import { DownloadControl } from '@/shared/ui'

import { VideoUnavailableError } from '../lib/download-product-video'
import { useDownloadVideo } from '../model/use-download-video'

interface DownloadVideoButtonProps {
	product: Product
	align?: 'start' | 'end'
}

function formatError(error: Error): string {
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

export function DownloadVideoButton({ product, align }: DownloadVideoButtonProps) {
	const { downloadVideo, ...download } = useDownloadVideo(product)
	const hasVideo = product.video !== null

	return (
		<DownloadControl
			download={download}
			label='Скачать видео'
			variant={hasVideo ? 'light' : 'default'}
			disabled={!hasVideo}
			hint={hasVideo ? undefined : 'У товара нет видео'}
			onStart={downloadVideo}
			progressLabel='Прогресс скачивания видео'
			formatProgress={({ done, total }) => `Сегментов ${done} из ${total}`}
			formatError={formatError}
			savedMessage='Видео сохранено'
			align={align}
		/>
	)
}
