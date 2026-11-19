import { useState } from 'react'

import { Container, Stack, Text, Title } from '@mantine/core'

import { ProductMediaModal } from '@/widgets/product-media-modal'

import { ArticleForm } from './ArticleForm'

export function HomePage() {
	const [productId, setProductId] = useState<number | null>(null)

	return (
		<Container size='sm' py='xl'>
			<Stack gap='lg'>
				<Stack gap={4}>
					<Title order={1}>WB Media Downloader</Title>
					<Text c='dimmed'>Фото и видео с карточки товара Wildberries по артикулу</Text>
				</Stack>
				<ArticleForm onSubmit={setProductId} />
			</Stack>
			<ProductMediaModal
				productId={productId}
				onClose={() => {
					setProductId(null)
				}}
			/>
		</Container>
	)
}
