import type { ReactNode } from 'react'

import { Box, SimpleGrid, Stack, Text } from '@mantine/core'

import { DownloadErrorRegion } from '@/shared/ui'

import classes from './GalleryLayout.module.css'

interface GalleryLayoutProps {
	title: ReactNode
	/** Select-all row; omitted when there is nothing to select. */
	toolbar?: ReactNode
	/** Grid tiles, or a message instead of the grid. */
	children: ReactNode
	grid?: boolean
	footer: ReactNode
	/** Skeleton state: announced as busy, no appear animation. */
	loading?: boolean
	/** Fade in gallery body only after a loading phase, not when data was already cached. */
	contentAppear?: boolean
	waitingForNetwork: boolean
}

/**
 * One layout for the gallery and its skeleton: the loaded card lands exactly
 * where the placeholders were, so nothing jumps when data arrives.
 */
export function GalleryLayout({
	title,
	toolbar,
	children,
	grid = true,
	footer,
	loading = false,
	contentAppear = false,
	waitingForNetwork
}: GalleryLayoutProps) {
	return (
		<Stack
			gap='md'
			className={classes.layout}
			aria-busy={(loading && !waitingForNetwork) || undefined}
			aria-label={loading ? 'Загрузка карточки' : undefined}
		>
			<Stack
				gap='sm'
				className={contentAppear ? `${classes.scroll} ${classes.content}` : classes.scroll}
				data-loading={loading || undefined}
			>
				<Box className={classes.header}>
					<Box className={classes.headerSlots} data-paused={waitingForNetwork || undefined}>
						<Box className={classes.title}>{title}</Box>
						{toolbar}
					</Box>
					{waitingForNetwork && (
						<Text className={classes.offline} role='status' size='sm'>
							<strong>Нет сети.</strong> Загрузка карточки продолжится после подключения.
						</Text>
					)}
				</Box>
				{grid ? (
					<SimpleGrid className={classes.grid} cols={{ base: 2, xs: 3, sm: 4 }} spacing='sm'>
						{children}
					</SimpleGrid>
				) : (
					children
				)}
			</Stack>
			<Box className={classes.footer}>
				<DownloadErrorRegion>
					<Box className={classes.actions}>{footer}</Box>
				</DownloadErrorRegion>
			</Box>
		</Stack>
	)
}
