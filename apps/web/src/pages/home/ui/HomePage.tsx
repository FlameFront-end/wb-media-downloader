import { useState } from 'react'

import { Container, Stack, Text, Title } from '@mantine/core'

import { preloadProductMediaModal } from '../lib/load-product-media-modal'

import { ArticleForm } from './ArticleForm'
import { LazyProductMediaModal } from './LazyProductMediaModal'

export function HomePage() {
	const [productId, setProductId] = useState<number | null>(null)
	// Mount the lazy modal on first use and keep it mounted, so closing can animate
	const [modalUsed, setModalUsed] = useState(false)

	return (
		<Container size='sm' py='xl'>
			<Stack gap='lg'>
				<Stack gap={4}>
					<Title order={1}>WB Media Downloader</Title>
					<Text c='dimmed'>Фото и видео с карточки товара Wildberries по артикулу</Text>
				</Stack>
				<ArticleForm
					onIntent={preloadProductMediaModal}
					onSubmit={article => {
						setModalUsed(true)
						setProductId(article)
					}}
				/>
			</Stack>
			{modalUsed && (
				<LazyProductMediaModal
					productId={productId}
					onClose={() => {
						setProductId(null)
					}}
				/>
			)}
		</Container>
	)
}
