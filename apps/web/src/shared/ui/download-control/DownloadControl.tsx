import type { ReactNode } from 'react'

import { Button, Group, Progress, Stack, Text, type ButtonProps } from '@mantine/core'

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
}

/** Download button with cancel, offline hint, progress and error: the same flow for every file type. */
export function DownloadControl({
	download: { cancel, progress, isPending, isPaused, error },
	label,
	onStart,
	variant,
	disabled,
	hint,
	progressLabel,
	formatProgress,
	formatError
}: DownloadControlProps) {
	return (
		<Stack gap={6}>
			<Group gap='xs'>
				<Button variant={variant} loading={isPending} disabled={disabled} onClick={onStart}>
					{label}
				</Button>
				{isPending && (
					<Button variant='subtle' color='gray' onClick={cancel}>
						Отмена
					</Button>
				)}
			</Group>

			{hint && !isPending && (
				<Text size='xs' c='dimmed'>
					{hint}
				</Text>
			)}

			{isPaused && (
				<Text size='xs' c='dimmed' aria-live='polite'>
					Нет сети — загрузка начнётся после подключения
				</Text>
			)}

			{progress && (
				<Stack gap={4} aria-live='polite'>
					<Progress
						value={progress.total === 0 ? 0 : (progress.done / progress.total) * 100}
						size='sm'
						aria-label={progressLabel}
					/>
					<Text size='xs' c='dimmed'>
						{formatProgress(progress)}
					</Text>
				</Stack>
			)}

			{error && (
				<Text size='sm' c='red' role='alert'>
					{formatError(error)}
				</Text>
			)}
		</Stack>
	)
}
