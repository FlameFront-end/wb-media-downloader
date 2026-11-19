import type { Product } from '@/entities/product'
import { DownloadControl } from '@/shared/ui'

import { PhotoDownloadError } from '../lib/create-photos-zip'
import { useDownloadPhotos } from '../model/use-download-photos'

interface DownloadPhotosButtonProps {
	product: Product
	selectedIndexes: readonly number[]
}

function formatError(error: Error): string {
	return error instanceof PhotoDownloadError
		? `Не удалось скачать ${error.filename}. Попробуйте ещё раз.`
		: 'Не удалось собрать архив. Попробуйте ещё раз.'
}

export function DownloadPhotosButton({ product, selectedIndexes }: DownloadPhotosButtonProps) {
	const { downloadPhotos, ...download } = useDownloadPhotos(product)
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
		/>
	)
}
