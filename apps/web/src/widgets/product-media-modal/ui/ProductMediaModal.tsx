import { useEffect, useState } from 'react'

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
	// Keep the last gallery visible until Mantine unmounts the closing dialog.
	const [gallery, setGallery] = useState({ productId, displayedId: productId, opening: 0 })
	if (gallery.productId !== productId) {
		setGallery({
			productId,
			displayedId: productId ?? gallery.displayedId,
			opening: productId === null ? gallery.opening : gallery.opening + 1
		})
	}
	const opened = productId !== null

	// Read synchronously, so the modal does not open as a window and then jump to full screen
	const isPhone = useMediaQuery(PHONE_QUERY, false, { getInitialValueInEffect: false })
	// Mantine reads reduced motion in an effect, too late for a modal that mounts already open
	const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY, false, { getInitialValueInEffect: false })
	const transition = isPhone ? PHONE_TRANSITION : DESKTOP_TRANSITION
	// Mantine only animates when opened changes after the first render.
	const [ready, setReady] = useState(false)
	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			setReady(true)
		})
		return () => {
			cancelAnimationFrame(frame)
		}
	}, [])

	return (
		<Modal
			opened={opened && (ready || reduceMotion)}
			onClose={onClose}
			title='Фото и видео товара'
			closeButtonProps={{ 'aria-label': 'Закрыть галерею' }}
			size='xl'
			// Keep the dialog footprint stable while the card loads.
			yOffset='6dvh'
			fullScreen={isPhone}
			classNames={{
				title: classes.title,
				header: classes.header,
				content: classes.content,
				body: classes.body
			}}
			// Dense, slightly blurred backdrop: the page behind does not compete with the gallery
			overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}
			// Phones: a sheet sliding up; wider screens: a short pop from the center
			transitionProps={reduceMotion ? { ...transition, duration: 0 } : transition}
			onExitTransitionEnd={onExited}
			// Focus goes back to the trigger via onExited: Mantine may miss it when the modal mounts open
			returnFocus={false}
		>
			{gallery.displayedId !== null && (
				<ProductMediaContent key={gallery.opening} productId={gallery.displayedId} active={opened} />
			)}
		</Modal>
	)
}
