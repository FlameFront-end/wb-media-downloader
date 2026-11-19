import { createContext, useContext, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Button, CloseButton, Skeleton, Text, Transition, VisuallyHidden, type ButtonProps } from '@mantine/core'

import type { DownloadProgress, DownloadState } from '@/shared/lib'

import classes from './DownloadControl.module.css'

interface DownloadControlProps {
	download: DownloadState
	/** Also the button's accessible name in every state. */
	label: string
	onStart: () => void
	variant?: ButtonProps['variant']
	disabled?: boolean
	/** Static note under an idle button, e.g. why it is disabled. */
	hint?: ReactNode
	progressLabel: string
	/** Short enough to fit the button. */
	formatProgress: (progress: DownloadProgress) => string
	formatError: (error: Error) => string
	/** Shown in the button for a moment after the file was saved. */
	savedMessage: string
}

type ControlState = 'idle' | 'busy' | 'saved'

const PAUSED_MESSAGE = 'Нет сети — загрузка начнётся после подключения'
const DownloadErrorHost = createContext<HTMLDivElement | null>(null)

/** Positions errors as a stack above all the download buttons. */
export function DownloadErrorRegion({ children }: { children: ReactNode }) {
	const [host, setHost] = useState<HTMLDivElement | null>(null)

	return (
		<DownloadErrorHost.Provider value={host}>
			{children}
			<div ref={setHost} className={classes.errorRegion} />
		</DownloadErrorHost.Provider>
	)
}

/**
 * Keeps the last non-null value, so a fading error still shows its text
 * instead of going blank mid-animation.
 */
function useLastValue<Value>(value: Value | null): Value | null {
	const [last, setLast] = useState(value)

	if (value !== null && value !== last) {
		setLast(value)
	}

	return value ?? last
}

function CheckIcon() {
	return (
		<svg className={classes.check} viewBox='0 0 16 16' aria-hidden>
			<path d='M3.5 8.5l3 3 6-7' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
		</svg>
	)
}

/**
 * The whole download lives inside the button: it fills with progress, its label
 * changes in place, and it turns green for a moment once the file is saved.
 * Cancel takes a slot reserved next to it and errors float above it, so the
 * download bar never changes its height.
 */
export function DownloadControl({
	download: { cancel, progress, isPending, isPaused, error, isSaved, dismissError },
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
	const shownError = useLastValue(error)
	const errorHost = useContext(DownloadErrorHost)
	const buttonRef = useRef<HTMLButtonElement>(null)

	const restoreButtonFocus = () => {
		const button = buttonRef.current
		const target = button?.disabled
			? button.closest('[role="dialog"]')?.querySelector<HTMLButtonElement>('button:not(:disabled)')
			: button
		target?.focus({ preventScroll: true })
	}
	// Saved wins over the last pending render, so the end of a download never flashes «Подготовка…»
	const state: ControlState = isSaved ? 'saved' : isPending ? 'busy' : 'idle'

	// While the busy label fades out it keeps the last progress instead of falling back to «Подготовка…»
	const lastProgress = useLastValue(progress)
	const shownProgress = state === 'busy' ? progress : lastProgress

	let busyText = 'Подготовка…'

	if (isPaused) {
		busyText = 'Ждём сеть…'
	} else if (shownProgress) {
		busyText = formatProgress(shownProgress)
	}

	const fraction = shownProgress?.total ? shownProgress.done / shownProgress.total : 0
	const fillStyle = { '--download-progress': state === 'saved' ? 1 : fraction } as CSSProperties

	const errorNotice = (
		<Transition mounted={error !== null} transition='slide-up' duration={180}>
			{style => (
				<div className={classes.error} style={style} inert={error === null}>
					{shownError && (
						<div className={classes.errorCard} role={error ? 'alert' : undefined}>
							<Text size='sm' flex={1}>
								{formatError(shownError)}
							</Text>
							<CloseButton
								size='sm'
								aria-label='Скрыть ошибку'
								onClick={() => {
									restoreButtonFocus()
									dismissError()
								}}
							/>
						</div>
					)}
				</div>
			)}
		</Transition>
	)

	return (
		<div className={classes.root}>
			{errorHost ? createPortal(errorNotice, errorHost) : errorNotice}

			<div className={classes.main}>
				<div className={classes.buttonFrame} data-state={state}>
					<Button
						className={classes.button}
						ref={buttonRef}
						classNames={{ inner: classes.inner, label: classes.buttonLabel }}
						data-state={state}
						variant={variant}
						color={state === 'saved' ? 'teal' : undefined}
						disabled={disabled}
						aria-disabled={state === 'busy' || undefined}
						aria-busy={state === 'busy' || undefined}
						// Busy and saved texts are visual: progress is announced by the progressbar, saving by the status
						aria-label={label}
						onClick={state === 'busy' ? undefined : onStart}
						fullWidth
					>
						<span className={classes.labels}>
							{/* The idle label always takes the space, the others are laid over it */}
							<span className={classes.label} data-active={state === 'idle' || undefined} aria-hidden>
								{label}
							</span>
							<span
								className={`${classes.label} ${classes.overlay}`}
								data-active={state === 'busy' || undefined}
								aria-hidden
							>
								{busyText}
							</span>
							<span
								className={`${classes.label} ${classes.overlay}`}
								data-active={state === 'saved' || undefined}
								aria-hidden
							>
								<CheckIcon />
								{savedMessage}
							</span>
						</span>
					</Button>
					<div className={classes.fillTrack}>
						<div
							className={classes.fill}
							style={fillStyle}
							data-shown={(state === 'busy' && progress !== null) || undefined}
							data-indeterminate={(state === 'busy' && progress === null && !isPaused) || undefined}
							role={state === 'busy' ? 'progressbar' : undefined}
							aria-label={state === 'busy' ? progressLabel : undefined}
							aria-valuemin={state === 'busy' ? 0 : undefined}
							aria-valuemax={state === 'busy' ? 100 : undefined}
							aria-valuenow={state === 'busy' && progress ? Math.round(fraction * 100) : undefined}
							aria-valuetext={state === 'busy' ? busyText : undefined}
						/>
					</div>
					{/* Laid over the pill's right edge as a sibling of the button: no nested buttons */}
					<CloseButton
						className={classes.cancel}
						data-shown={state === 'busy' || undefined}
						aria-label='Отмена'
						title='Отменить скачивание'
						aria-hidden={state !== 'busy'}
						tabIndex={state === 'busy' ? undefined : -1}
						onClick={() => {
							restoreButtonFocus()
							cancel()
						}}
					/>
				</div>
			</div>

			{hint && (
				<Text size='xs' c='dimmed' mt={6}>
					{hint}
				</Text>
			)}

			{/* Screen readers hear what the button only shows */}
			<VisuallyHidden aria-live='polite'>{isPaused ? PAUSED_MESSAGE : null}</VisuallyHidden>
			{isSaved && <VisuallyHidden role='status'>{savedMessage}</VisuallyHidden>}
		</div>
	)
}

interface DownloadControlSkeletonProps {
	animate?: boolean
}

/** Placeholder with the exact footprint of a DownloadControl button, column alignment included. */
export function DownloadControlSkeleton({ animate = true }: DownloadControlSkeletonProps) {
	return (
		<div className={classes.root} aria-hidden>
			<div className={classes.main}>
				<Skeleton animate={animate} className={classes.skeleton} data-testid='download-button-skeleton' />
			</div>
		</div>
	)
}
