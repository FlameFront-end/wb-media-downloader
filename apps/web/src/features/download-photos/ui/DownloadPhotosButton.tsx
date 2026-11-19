import type { Product } from '@/entities/product'
import { InvalidResponseError, isTimeoutError, ResponseTooLargeError } from '@/shared/api'
import { DownloadControl } from '@/shared/ui'

import { PhotoDownloadError } from '../lib/create-photos-zip'
import { useDownloadPhotos } from '../model/use-download-photos'

interface DownloadPhotosButtonProps {
	product: Product
	active: boolean
	selectedIndexes: readonly number[]
}

function formatError(error: Error): string {
	if (error instanceof ResponseTooLargeError) {
		return 'Архив слишком большой. Выберите меньше фотографий.'
	}
	if (error instanceof PhotoDownloadError && error.cause instanceof ResponseTooLargeError) {
		return `Фото ${error.filename} слишком большое для скачивания в браузере.`
	}

	if (error instanceof PhotoDownloadError && isTimeoutError(error.cause)) {
		return `Фото ${error.filename} не загрузилось вовремя. Попробуйте ещё раз.`
	}

	if (error instanceof PhotoDownloadError && error.cause instanceof InvalidResponseError) {
		return `CDN вернул повреждённое фото ${error.filename}. Архив не сохранён.`
	}

	return error instanceof PhotoDownloadError
		? `Не удалось скачать ${error.filename}. Попробуйте ещё раз.`
		: 'Не удалось собрать архив. Попробуйте ещё раз.'
}

export function DownloadPhotosButton({ product, active, selectedIndexes }: DownloadPhotosButtonProps) {
	const { downloadPhotos, ...download } = useDownloadPhotos(product, active)
	const count = selectedIndexes.length

	return (
		<DownloadControl
			download={download}
			label={count > 0 ? `Скачать фото (${count})` : 'Скачать фото'}
			disabled={count === 0}
			onStart={() => {
				downloadPhotos(selectedIndexes)
			}}
			progressLabel='Прогресс скачивания фото'
			formatProgress={({ done, total }) => `Загружено ${done} из ${total}`}
			formatError={formatError}
			savedMessage='Архив сохранён'
		/>
	)
}
