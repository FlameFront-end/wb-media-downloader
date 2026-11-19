import { Modal } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

import { ProductMediaContent } from './ProductMediaContent'
import classes from './ProductMediaModal.module.css'

export interface ProductMediaModalProps {
	productId: number | null
	onClose: () => void
}

// Mantine `xs` breakpoint: phones get the whole screen for the gallery
const PHONE_QUERY = '(max-width: 36em)'

export function ProductMediaModal({ productId, onClose }: ProductMediaModalProps) {
	// Read synchronously, so the modal does not open centered and jump to full screen
	const isPhone = useMediaQuery(PHONE_QUERY, false, { getInitialValueInEffect: false })

	return (
		<Modal
			opened={productId !== null}
			onClose={onClose}
			title='Фото и видео товара'
			size='xl'
			centered
			fullScreen={isPhone}
			classNames={{ title: classes.title, header: classes.header, body: classes.body }}
			// Dense, slightly blurred backdrop: the page behind does not compete with the gallery
			overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}
		>
			{productId !== null && <ProductMediaContent key={productId} productId={productId} />}
		</Modal>
	)
}
