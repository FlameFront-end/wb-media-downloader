import { useState } from 'react'

import { Alert, Button, Stack, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import { ProductNotFoundError, productQueries } from '@/entities/product'

import { describeLoadError } from '../lib/describe-load-error'

import { ProductGallery } from './ProductGallery'
import { ProductMediaMessage } from './ProductMediaMessage'
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

	// TanStack drops an errored query without data back to «pending» on refetch, which would
	// swap the error for the skeleton. A retry from the error screen stays on it, with the
	// loader in its button, until the request settles.
	// The query clears its error while refetching: keep explaining the failure being retried
	const [retriedError, setRetriedError] = useState<Error | null>(null)

	const retry = () => {
		void refetch()
	}

	const retryFromError = () => {
		if (!error || isFetching || isPaused) {
			return
		}
		setRetriedError(error)
		void refetch()
	}

	if (retriedError && !product && isPending) {
		return (
			<LoadError
				error={retriedError}
				retrying={isFetching}
				waitingForNetwork={isPaused}
				onRetry={retryFromError}
			/>
		)
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
			<ProductMediaMessage tone='notFound' title='Товар не найден'>
				Карточки с артикулом {productId} нет. Проверьте артикул.
			</ProductMediaMessage>
		)
	}

	return <LoadError error={error} onRetry={retryFromError} />
}

interface LoadErrorProps {
	error: Error | null
	retrying?: boolean
	waitingForNetwork?: boolean
	onRetry: () => void
}

function LoadError({ error, retrying, waitingForNetwork, onRetry }: LoadErrorProps) {
	return (
		<ProductMediaMessage
			tone='error'
			title='Не удалось загрузить карточку'
			action={
				<Button variant='default' loading={retrying} disabled={waitingForNetwork} onClick={onRetry}>
					{waitingForNetwork ? 'Ждём сеть…' : 'Повторить'}
				</Button>
			}
		>
			{waitingForNetwork
				? 'Нет сети. Загрузка карточки продолжится после подключения.'
				: describeLoadError(error)}
		</ProductMediaMessage>
	)
}
