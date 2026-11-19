import type { Product } from '@/entities/product'
import { isTimeoutError } from '@/shared/api'
import { InvalidSegmentError, UnsupportedPlaylistError } from '@/shared/lib'
import { DownloadControl } from '@/shared/ui'

import { VideoUnavailableError } from '../lib/download-product-video'
import { useDownloadVideo } from '../model/use-download-video'

interface DownloadVideoButtonProps {
	product: Product
	active: boolean
}

function formatError(error: Error): string {
	if (isTimeoutError(error)) {
		return 'Сервер видео долго не отвечает. Попробуйте ещё раз.'
	}

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

export function DownloadVideoButton({ product, active }: DownloadVideoButtonProps) {
	const { downloadVideo, ...download } = useDownloadVideo(product, active)
	const hasVideo = product.videoAvailability === 'available'
	const hints = {
		available: undefined,
		absent: 'У товара нет видео',
		unknown: 'В карточке нет информации о видео',
		unavailable: 'Видео недоступно на CDN'
	}

	return (
		<DownloadControl
			download={download}
			label='Скачать видео'
			variant={hasVideo ? 'light' : 'default'}
			disabled={!hasVideo}
			hint={hints[product.videoAvailability]}
			onStart={downloadVideo}
			progressLabel='Прогресс скачивания видео'
			formatProgress={({ done, total, bytesReceived }) => {
				if (!bytesReceived) {
					return `${done} из ${total}`
				}
				const kib = Math.round(bytesReceived / 1024)
				const loaded = kib < 1024 ? `${kib} КБ` : `${(kib / 1024).toFixed(1).replace('.', ',')} МБ`
				return `${done} из ${total} · ${loaded}`
			}}
			formatError={formatError}
			savedMessage='Видео сохранено'
		/>
	)
}
