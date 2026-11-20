import { lazy, Suspense } from 'react'

import { Alert, Button } from '@mantine/core'
import { ErrorBoundary } from 'react-error-boundary'

import type { ProductMediaModalProps } from '@/widgets/product-media-modal'

import { loadProductMediaModal } from '../../lib/load-product-media-modal'
import { reloadPage } from '../../lib/reload-page'

import classes from './LazyProductMediaModal.module.css'

const ProductMediaModal = lazy(async () => ({ default: (await loadProductMediaModal()).ProductMediaModal }))

/**
 * A failed chunk import cannot be retried in place: React.lazy keeps the rejection,
 * and Chromium keeps the failed module in its module map. Reloading the page is the
 * only reliable recovery, so the error offers exactly that.
 */
export function LazyProductMediaModal({ productId, onClose, onExited }: ProductMediaModalProps) {
	const fallback =
		productId === null ? null : (
			<Alert
				classNames={{ root: classes.error, body: classes.body }}
				variant='light'
				color='red'
				title='Не удалось загрузить галерею'
				withCloseButton
				closeButtonLabel='Закрыть'
				onClose={() => {
					onClose()
					onExited?.()
				}}
			>
				Проверьте подключение к интернету и обновите страницу.
				<Button
					classNames={{ root: classes.reload, label: classes.reloadLabel }}
					mt='sm'
					size='sm'
					variant='default'
					onClick={reloadPage}
				>
					Перезагрузить страницу
				</Button>
			</Alert>
		)

	return (
		<ErrorBoundary fallback={fallback}>
			<Suspense fallback={null}>
				<ProductMediaModal productId={productId} onClose={onClose} onExited={onExited} />
			</Suspense>
		</ErrorBoundary>
	)
}
