import { useRef, useState } from 'react'

import { Box, Container, Stack, Text, Title } from '@mantine/core'

import { loadProductMediaModal, preloadProductMediaModal } from '../lib/load-product-media-modal'

import { ArticleForm } from './ArticleForm'
import classes from './HomePage.module.css'
import { LazyProductMediaModal } from './LazyProductMediaModal'

export function HomePage() {
	const [productId, setProductId] = useState<number | null>(null)
	// Mount the lazy modal on first use and keep it mounted, so closing can animate
	const [modalUsed, setModalUsed] = useState(false)
	const [opening, setOpening] = useState(false)
	const requestedRef = useRef<number | null>(null)
	// Input (Enter) or button (click): focus returns there once the modal has closed
	const triggerRef = useRef<HTMLElement | null>(null)

	const open = (article: number) => {
		requestedRef.current = article
		triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
		setOpening(true)

		// The chunk is usually preloaded on intent. If not, the button spins until it arrives and the
		// modal then opens with its transition, instead of after a blank pause. A failed load is
		// reported by the lazy modal itself.
		void loadProductMediaModal()
			.catch(() => undefined)
			.then(() => {
				// A newer submit took over while this one was waiting
				if (requestedRef.current !== article) {
					return
				}

				setOpening(false)
				setModalUsed(true)
				setProductId(article)
			})
	}

	return (
		<Box className={classes.page}>
			<Container size='xs' py='xl' className={classes.hero}>
				<Stack gap='xl'>
					<Stack gap='sm'>
						<Text className={classes.badge}>Wildberries</Text>
						<Title order={1} fz={{ base: 28, sm: 38 }} className={classes.title}>
							WB Media Downloader
						</Title>
						<Text className={classes.lead}>Скачивайте фото и видео с карточек Wildberries.</Text>
					</Stack>
					<Box className={classes.card}>
						<ArticleForm onIntent={preloadProductMediaModal} loading={opening} onSubmit={open} />
					</Box>
					<Text className={classes.note}>Фото сохраняются в ZIP, видео — в MP4.</Text>
				</Stack>
			</Container>
			{modalUsed && (
				<LazyProductMediaModal
					productId={productId}
					onClose={() => {
						setProductId(null)
					}}
					onExited={() => {
						triggerRef.current?.focus()
						triggerRef.current = null
					}}
				/>
			)}
		</Box>
	)
}
