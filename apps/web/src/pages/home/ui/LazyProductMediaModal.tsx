import { lazy, Suspense } from 'react'

import { Alert, Button } from '@mantine/core'
import { ErrorBoundary } from 'react-error-boundary'

import type { ProductMediaModalProps } from '@/widgets/product-media-modal'

import { loadProductMediaModal } from '../lib/load-product-media-modal'
import { reloadPage } from '../lib/reload-page'

const ProductMediaModal = lazy(async () => ({ default: (await loadProductMediaModal()).ProductMediaModal }))

/**
 * A failed chunk import cannot be retried in place: React.lazy keeps the rejection,
 * and Chromium keeps the failed module in its module map. Reloading the page is the
 * only reliable recovery, so the error offers exactly that.
 */
export function LazyProductMediaModal({ productId, onClose }: ProductMediaModalProps) {
	return (
		<ErrorBoundary
			fallback={
				productId !== null && (
					<Alert
						mt='lg'
						color='red'
						title='Не удалось загрузить галерею'
						withCloseButton
						closeButtonLabel='Закрыть'
						onClose={onClose}
					>
						Проверьте подключение к интернету и перезагрузите страницу — возможно, вышла новая версия
						приложения.
						<Button display='block' mt='sm' size='xs' variant='light' color='red' onClick={reloadPage}>
							Перезагрузить страницу
						</Button>
					</Alert>
				)
			}
		>
			<Suspense fallback={null}>
				<ProductMediaModal productId={productId} onClose={onClose} />
			</Suspense>
		</ErrorBoundary>
	)
}
