import { useState, type ReactNode } from 'react'

import { Button, Collapse, Group, Progress, Stack, Text, type ButtonProps } from '@mantine/core'

import type { DownloadProgress, DownloadState } from '@/shared/lib'

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
		<Collapse expanded={shown} transitionDuration={COLLAPSE_MS} keepMounted={false} w='100%'>
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
		// The button keeps its size (the loader replaces the label) and status lines open below it,
		// so starting a download never reflows the bar
		<Stack gap={0} align='flex-start' w='100%' miw={0}>
			<Button variant={variant} loading={isPending} disabled={disabled} onClick={onStart}>
				{label}
			</Button>

			{hint && !isPending && (
				<Text size='xs' c='dimmed' mt={6}>
					{hint}
				</Text>
			)}

			<Status shown={isPending}>
				<Stack gap={4} pt={8} w='100%' maw={320} aria-live='polite'>
					{shownProgress && (
						<Progress
							value={shownProgress.total === 0 ? 0 : (shownProgress.done / shownProgress.total) * 100}
							size='sm'
							transitionDuration={200}
							aria-label={progressLabel}
						/>
					)}
					<Group gap='xs' justify='space-between' wrap='nowrap'>
						<Text size='xs' c='dimmed' flex={1} miw={0}>
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
					<Text size='sm' c='red' pt={6} role='alert'>
						{formatError(shownError)}
					</Text>
				)}
			</Status>

			<Status shown={isSaved}>
				<Text size='xs' c='teal' pt={6} role='status'>
					{savedMessage}
				</Text>
			</Status>
		</Stack>
	)
}
