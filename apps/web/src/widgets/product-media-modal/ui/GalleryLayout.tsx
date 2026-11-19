import type { ReactNode } from 'react'

import { Box, SimpleGrid, Stack } from '@mantine/core'

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
}

/**
 * One layout for the gallery and its skeleton: the loaded card lands exactly
 * where the placeholders were, so nothing jumps when data arrives.
 */
export function GalleryLayout({ title, toolbar, children, grid = true, footer, loading = false }: GalleryLayoutProps) {
	return (
		<Stack
			gap='md'
			className={loading ? undefined : classes.root}
			aria-busy={loading || undefined}
			aria-label={loading ? 'Загрузка карточки' : undefined}
		>
			{title}
			{toolbar}
			{grid ? (
				<SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing='sm'>
					{children}
				</SimpleGrid>
			) : (
				children
			)}
			{/* Sticks to the bottom of the scrolling modal: downloads stay in reach in a long gallery */}
			<Box className={classes.footer}>
				{/* Two fixed columns: a growing status in one never pushes the other button around */}
				<SimpleGrid cols={2} spacing='md'>
					{footer}
				</SimpleGrid>
			</Box>
		</Stack>
	)
}
