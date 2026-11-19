import { Modal, type ModalProps } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

import { ProductMediaContent } from './ProductMediaContent'
import classes from './ProductMediaModal.module.css'

export interface ProductMediaModalProps {
	productId: number | null
	onClose: () => void
	/** The close transition finished: the place to return focus to whatever opened the modal. */
	onExited?: () => void
}

// Mantine `xs` breakpoint: phones get the whole screen for the gallery
const PHONE_QUERY = '(max-width: 36em)'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const PHONE_TRANSITION: ModalProps['transitionProps'] = {
	transition: 'slide-up',
	duration: 260,
	timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
}
const DESKTOP_TRANSITION: ModalProps['transitionProps'] = {
	transition: 'pop',
	duration: 200,
	timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
}

export function ProductMediaModal({ productId, onClose, onExited }: ProductMediaModalProps) {
	// Read synchronously, so the modal does not open as a window and then jump to full screen
	const isPhone = useMediaQuery(PHONE_QUERY, false, { getInitialValueInEffect: false })
	// Mantine reads reduced motion in an effect, too late for a modal that mounts already open
	const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY, false, { getInitialValueInEffect: false })
	const transition = isPhone ? PHONE_TRANSITION : DESKTOP_TRANSITION

	return (
		<Modal
			opened={productId !== null}
			onClose={onClose}
			title='Фото и видео товара'
			size='xl'
			// Anchored to the top, not centered: when the card replaces the skeleton the modal only
			// grows downwards, nothing above the photos moves
			yOffset='6dvh'
			fullScreen={isPhone}
			classNames={{ title: classes.title, header: classes.header, body: classes.body }}
			// Dense, slightly blurred backdrop: the page behind does not compete with the gallery
			overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}
			// Phones: a sheet sliding up; wider screens: a short pop from the center
			transitionProps={reduceMotion ? { ...transition, duration: 0 } : transition}
			onExitTransitionEnd={onExited}
			// Focus goes back to the trigger via onExited: Mantine may miss it when the modal mounts open
			returnFocus={false}
		>
			{productId !== null && <ProductMediaContent key={productId} productId={productId} />}
		</Modal>
	)
}
