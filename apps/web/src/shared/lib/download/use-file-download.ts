import { useCallback, useEffect, useRef, useState } from 'react'

import { useMutation, type MutationKey } from '@tanstack/react-query'

import { isAbortError } from '../errors/is-abort-error'

import { saveBlob } from './save-blob'

export interface DownloadProgress {
	done: number
	total: number
}

export interface DownloadTaskContext {
	signal: AbortSignal
	onProgress: (done: number, total: number) => void
}

export interface DownloadedFile {
	file: Blob
	filename: string
}

/** Builds the file. Created at click time, so it closes over the data the user actually saw. */
export type DownloadTask = (context: DownloadTaskContext) => Promise<DownloadedFile>

interface DownloadVariables {
	task: DownloadTask
	signal: AbortSignal
}

/** What the UI needs to render a download: everything except starting it. */
export interface DownloadState {
	cancel: () => void
	progress: DownloadProgress | null
	isPending: boolean
	/** Queued while offline: TanStack Query runs it once the network is back. */
	isPaused: boolean
	/** Last failure; cancellation is not an error. */
	error: Error | null
	/** True for a few seconds after the file was handed to the browser. */
	isSaved: boolean
}

export interface FileDownload extends DownloadState {
	start: (task: DownloadTask) => void
}

/**
 * Runs a file download as a mutation and saves the result.
 * Cancellation is bound to the click: a run that was cancelled, replaced or
 * outlived its component (paused offline, then resumed) never saves a file.
 */
const SAVED_HINT_MS = 4000

export function useFileDownload(mutationKey: MutationKey): FileDownload {
	const controllerRef = useRef<AbortController | null>(null)
	const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	const [progress, setProgress] = useState<DownloadProgress | null>(null)
	const [isSaved, setIsSaved] = useState(false)

	const hideSaved = useCallback(() => {
		clearTimeout(savedTimerRef.current)
		setIsSaved(false)
	}, [])

	// Unmounting (closing the modal) stops downloads nobody will save
	useEffect(
		() => () => {
			controllerRef.current?.abort()
			clearTimeout(savedTimerRef.current)
		},
		[]
	)

	const { mutate, reset, isPending, isPaused, error } = useMutation({
		mutationKey,
		mutationFn: async ({ task, signal }: DownloadVariables) => {
			// The mutation may start later than the click (paused while offline)
			signal.throwIfAborted()

			const { file, filename } = await task({
				signal,
				onProgress: (done, total) => {
					if (!signal.aborted) {
						setProgress({ done, total })
					}
				}
			})

			signal.throwIfAborted()
			saveBlob(file, filename)

			setIsSaved(true)
			clearTimeout(savedTimerRef.current)
			savedTimerRef.current = setTimeout(() => {
				setIsSaved(false)
			}, SAVED_HINT_MS)
		},
		onSettled: (_data, _error, { signal }) => {
			// A cancelled run may settle after a newer one started: don't clear its progress
			if (signal === controllerRef.current?.signal) {
				setProgress(null)
			}
		}
	})

	const start = useCallback(
		(task: DownloadTask) => {
			hideSaved()
			controllerRef.current?.abort()
			const controller = new AbortController()
			controllerRef.current = controller
			mutate({ task, signal: controller.signal })
		},
		[mutate, hideSaved]
	)

	const cancel = useCallback(() => {
		controllerRef.current?.abort()
		// A paused mutation stays pending until the network is back; the aborted signal
		// makes it a no-op then, so the UI can return to idle right away.
		reset()
		setProgress(null)
		hideSaved()
	}, [reset, hideSaved])

	return {
		start,
		cancel,
		progress,
		isPending,
		isPaused,
		error: error && !isAbortError(error) ? error : null,
		isSaved
	}
}
