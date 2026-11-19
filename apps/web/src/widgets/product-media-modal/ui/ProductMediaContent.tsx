import { Alert, Button, Stack, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import { ProductNotFoundError, productQueries } from '@/entities/product'

import { ProductGallery } from './ProductGallery'
import { ProductGallerySkeleton } from './ProductGallerySkeleton'

interface ProductMediaContentProps {
	productId: number
}

interface RetryButtonProps {
	loading: boolean
	onRetry: () => void
}

function RetryButton({ loading, onRetry }: RetryButtonProps) {
	return (
		<Button variant='light' color='red' size='xs' loading={loading} onClick={onRetry}>
			Повторить
		</Button>
	)
}

export function ProductMediaContent({ productId }: ProductMediaContentProps) {
	const { data: product, error, isPending, isFetching, refetch } = useQuery(productQueries.detail(productId))

	const retry = () => {
		void refetch()
	}

	// Keep the gallery (and its selection) mounted while cached data exists:
	// a failed background refetch is reported next to it, not instead of it.
	if (product) {
		return (
			<Stack gap='md'>
				{error && (
					<Alert color='red' title='Не удалось обновить карточку'>
						<Stack gap='xs' align='flex-start'>
							<Text size='sm'>Показаны ранее загруженные данные.</Text>
							<RetryButton loading={isFetching} onRetry={retry} />
						</Stack>
					</Alert>
				)}
				<ProductGallery key={product.id} product={product} />
			</Stack>
		)
	}

	if (isPending) {
		return <ProductGallerySkeleton />
	}

	if (error instanceof ProductNotFoundError) {
		return (
			<Alert color='yellow' title='Товар не найден'>
				Карточки с артикулом {productId} нет. Проверьте артикул.
			</Alert>
		)
	}

	return (
		<Alert color='red' title='Не удалось загрузить карточку'>
			<Stack gap='sm' align='flex-start'>
				<Text size='sm'>Проверьте подключение и попробуйте ещё раз.</Text>
				<RetryButton loading={isFetching} onRetry={retry} />
			</Stack>
		</Alert>
	)
}
