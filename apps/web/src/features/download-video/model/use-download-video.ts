import { useCallback, useEffect, useRef, useState } from 'react'

import { useMutation } from '@tanstack/react-query'

import type { Product, ProductVideo } from '@/entities/product'
import { isAbortError, saveBlob } from '@/shared/lib'

import { downloadProductVideo } from '../lib/download-product-video'

export interface DownloadProgress {
	done: number
	total: number
}

/** Everything the download needs, fixed at click time. */
interface DownloadVideoVariables {
	video: ProductVideo
	productId: number
	signal: AbortSignal
}

export function useDownloadVideo(product: Product) {
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
		mutationKey: ['download-video', product.id],
		mutationFn: async ({ video, productId, signal }: DownloadVideoVariables) => {
			// The mutation may start later than the click (paused while offline)
			signal.throwIfAborted()

			const { quality, file } = await downloadProductVideo(video, {
				signal,
				onProgress: (done, total) => {
					if (!signal.aborted) {
						setProgress({ done, total })
					}
				}
			})

			signal.throwIfAborted()
			saveBlob(file, `wb-${productId}-video-${quality}.mp4`)
		},
		onSettled: (_data, _error, { signal }) => {
			// A cancelled run may settle after a newer one started: don't clear its progress
			if (signal === controllerRef.current?.signal) {
				setProgress(null)
			}
		}
	})

	const { mutate, reset } = mutation

	const download = useCallback(() => {
		// Resolve sources now: the cached card may change before a paused mutation runs
		if (!product.video) {
			return
		}

		// Cancellation is bound to the click, not to the moment the request actually runs
		controllerRef.current?.abort()
		const controller = new AbortController()
		controllerRef.current = controller
		mutate({ video: product.video, productId: product.id, signal: controller.signal })
	}, [mutate, product])

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
