import { Alert, Button, Stack, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import { ProductNotFoundError, productQueries } from '@/entities/product'

import { ProductGallery } from './ProductGallery'
import classes from './ProductMediaModal.module.css'

interface ProductMediaContentProps {
	productId: number
	active: boolean
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

export function ProductMediaContent({ productId, active }: ProductMediaContentProps) {
	const {
		data: product,
		error,
		isPending,
		isFetching,
		isPaused,
		refetch
	} = useQuery(productQueries.detail(productId))

	const retry = () => {
		void refetch()
	}

	// One gallery instance for loading → loaded (and cache): the footer stays mounted.
	if (product || isPending) {
		return (
			<Stack gap='md' className={classes.fill} inert={!active}>
				{product && error && (
					<Alert color='red' title='Не удалось обновить карточку'>
						<Stack gap='xs' align='flex-start'>
							<Text size='sm'>Показаны ранее загруженные данные.</Text>
							<RetryButton loading={isFetching} onRetry={retry} />
						</Stack>
					</Alert>
				)}
				<ProductGallery product={product} active={active} waitingForNetwork={isPaused} />
			</Stack>
		)
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
