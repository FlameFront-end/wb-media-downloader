import { useState, type ReactNode } from 'react'

import { Box, Button, Collapse, Group, Progress, Stack, Text, type ButtonProps } from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'

import type { DownloadProgress, DownloadState } from '@/shared/lib'

import classes from './DownloadControl.module.css'

interface DownloadControlProps {
	download: DownloadState
	label: ReactNode
	onStart: () => void
	variant?: ButtonProps['variant']
	disabled?: boolean
	/** Shown under an idle button, e.g. why it is disabled. */
	hint?: ReactNode
	progressLabel: string
	formatProgress: (progress: DownloadProgress) => string
	formatError: (error: Error) => string
	/** Shown for a few seconds after the file was saved. */
	savedMessage: string
}

const COLLAPSE_MS = 180

/**
 * Keeps the last non-null value, so a collapsing block still shows what it showed
 * instead of going blank mid-animation.
 */
function useLastValue<Value>(value: Value | null): Value | null {
	const [last, setLast] = useState(value)

	if (value !== null && value !== last) {
		setLast(value)
	}

	return value ?? last
}

interface StatusProps {
	shown: boolean
	children: ReactNode
}

/** Status lines slide open and closed: the sticky bar grows smoothly instead of jumping. */
function Status({ shown, children }: StatusProps) {
	return (
		<Collapse
			className={classes.status}
			expanded={shown}
			transitionDuration={COLLAPSE_MS}
			keepMounted={false}
			aria-hidden={!shown || undefined}
			inert={!shown}
		>
			{children}
		</Collapse>
	)
}

/** Download button with cancel, offline hint, progress, error and a saved note: the same flow for every file. */
export function DownloadControl({
	download: { cancel, progress, isPending, isPaused, error, isSaved },
	label,
	onStart,
	variant,
	disabled,
	hint,
	progressLabel,
	formatProgress,
	formatError,
	savedMessage
}: DownloadControlProps) {
	const reduceMotion = useReducedMotion(false, { getInitialValueInEffect: false })
	// While running show live values; while the status collapses keep the last ones on screen
	const lastProgress = useLastValue(progress)
	const shownProgress = isPending ? progress : lastProgress
	const shownError = useLastValue(error)

	let statusText = 'Подготовка…'

	if (isPaused) {
		statusText = 'Нет сети — загрузка начнётся после подключения'
	} else if (shownProgress) {
		statusText = formatProgress(shownProgress)
	}

	return (
		// The loader replaces the label without resizing the button.
		<Stack gap={0} align='flex-start' w='100%' miw={0}>
			<Button variant={variant} loading={isPending} disabled={disabled} onClick={onStart}>
				{label}
			</Button>

			{hint && !isPending && (
				<Text size='xs' c='dimmed' mt={6}>
					{hint}
				</Text>
			)}

			<Box className={classes.statusSlot}>
				<Status shown={isPending}>
					<Stack gap={4} pt={8} w='100%' maw={320} aria-live='polite'>
						<Progress
							value={shownProgress?.total ? (shownProgress.done / shownProgress.total) * 100 : 0}
							size='sm'
							transitionDuration={reduceMotion ? 0 : 200}
							aria-label={progressLabel}
							aria-hidden={!shownProgress || undefined}
							style={shownProgress ? undefined : { visibility: 'hidden' }}
						/>
						<Group gap='xs' justify='space-between' wrap='nowrap'>
							<Text size='xs' c='dimmed' flex={1} miw={0} className={classes.progressText}>
								{statusText}
							</Text>
							<Button variant='subtle' color='gray' size='compact-xs' onClick={cancel}>
								Отмена
							</Button>
						</Group>
					</Stack>
				</Status>

				<Status shown={error !== null}>
					{shownError && (
						<Text size='sm' c='red' pt={6} role='alert' className={classes.result}>
							{formatError(shownError)}
						</Text>
					)}
				</Status>

				<Status shown={isSaved}>
					<Text size='xs' c='teal' fw={500} pt={6} role='status' className={classes.result}>
						{savedMessage}
					</Text>
				</Status>
			</Box>
		</Stack>
	)
}
