import { Modal } from '@mantine/core'

import { ProductMediaContent } from './ProductMediaContent'

export interface ProductMediaModalProps {
	productId: number | null
	onClose: () => void
}

export function ProductMediaModal({ productId, onClose }: ProductMediaModalProps) {
	return (
		<Modal opened={productId !== null} onClose={onClose} title='Фото и видео товара' size='xl' centered>
			{productId !== null && <ProductMediaContent key={productId} productId={productId} />}
		</Modal>
	)
}
