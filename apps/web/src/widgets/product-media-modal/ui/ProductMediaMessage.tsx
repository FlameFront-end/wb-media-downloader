import type { ReactNode } from 'react'

import { Stack, Text, Title } from '@mantine/core'

import classes from './ProductMediaMessage.module.css'

interface ProductMediaMessageProps {
	tone: 'error' | 'notFound'
	title: string
	children: ReactNode
	action?: ReactNode
}

function ErrorIcon() {
	return (
		<svg viewBox='0 0 24 24' aria-hidden>
			<path d='M12 7v6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
			<circle cx='12' cy='17' r='1.2' fill='currentColor' />
		</svg>
	)
}

function SearchIcon() {
	return (
		<svg viewBox='0 0 24 24' aria-hidden fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
			<circle cx='11' cy='11' r='6' />
			<path d='M20 20l-4.5-4.5' />
		</svg>
	)
}

/** A calm, centered state for the whole modal body instead of a full-width colored banner. */
export function ProductMediaMessage({ tone, title, children, action }: ProductMediaMessageProps) {
	return (
		<Stack className={classes.message} role={tone === 'error' ? 'alert' : 'status'} gap='xs'>
			<div className={classes.icon} data-tone={tone}>
				{tone === 'error' ? <ErrorIcon /> : <SearchIcon />}
			</div>
			<Title order={3} size='h4' mt='xs'>
				{title}
			</Title>
			<Text c='dimmed' size='sm' maw={360}>
				{children}
			</Text>
			{action && <div className={classes.action}>{action}</div>}
		</Stack>
	)
}
