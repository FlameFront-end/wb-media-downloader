import { useCallback, useEffect, useRef, useState } from 'react'

import { useMutation } from '@tanstack/react-query'

import type { Product } from '@/entities/product'
import { isAbortError, saveBlob } from '@/shared/lib'

import { createPhotosZip, type ZipEntry } from '../lib/create-photos-zip'

export interface DownloadProgress {
	done: number
	total: number
}

/** Everything the download needs, fixed at click time. */
interface DownloadPhotosVariables {
	entries: readonly ZipEntry[]
	archiveName: string
	signal: AbortSignal
}

export function photoFilename(productId: number, index: number): string {
	return `wb-${productId}-${String(index).padStart(2, '0')}.webp`
}

export function useDownloadPhotos(product: Product) {
	const controllerRef = useRef<AbortController | null>(null)
	const [progress, setProgress] = useState<DownloadProgress | null>(null)

	// Closing the modal unmounts the button: stop downloads nobody will save
	useEffect(
		() => () => {
			controllerRef.current?.abort()
		},
		[]
	)

	const mutation = useMutation({
		mutationKey: ['download-photos', product.id],
		mutationFn: async ({ entries, archiveName, signal }: DownloadPhotosVariables) => {
			// The mutation may start later than the click (paused while offline):
			// the user could have cancelled or closed the modal in between.
			signal.throwIfAborted()

			const zip = await createPhotosZip(entries, {
				signal,
				onProgress: (done, total) => {
					if (!signal.aborted) {
						setProgress({ done, total })
					}
				}
			})

			signal.throwIfAborted()
			saveBlob(zip, archiveName)
		},
		onSettled: (_data, _error, { signal }) => {
			// A cancelled run may settle after a newer one started: don't clear its progress
			if (signal === controllerRef.current?.signal) {
				setProgress(null)
			}
		}
	})

	const { mutate, reset } = mutation

	const download = useCallback(
		(indexes: readonly number[]) => {
			// Resolve files now: the cached card may change before a paused mutation runs
			const wanted = new Set(indexes)
			const entries = product.photos
				.filter(photo => wanted.has(photo.index))
				.map(photo => ({ url: photo.originalUrl, filename: photoFilename(product.id, photo.index) }))

			if (entries.length === 0) {
				return
			}

			// Cancellation is bound to the click, not to the moment the request actually runs
			controllerRef.current?.abort()
			const controller = new AbortController()
			controllerRef.current = controller
			mutate({ entries, archiveName: `wb-${product.id}-photos.zip`, signal: controller.signal })
		},
		[mutate, product]
	)

	const cancel = useCallback(() => {
		controllerRef.current?.abort()
		// A paused mutation stays pending until the network is back; the aborted signal
		// makes it a no-op then, so the UI can return to idle right away.
		reset()
		setProgress(null)
	}, [reset])

	return {
		download,
		cancel,
		progress,
		isPending: mutation.isPending,
		isPaused: mutation.isPaused,
		error: mutation.error && !isAbortError(mutation.error) ? mutation.error : null
	}
}
