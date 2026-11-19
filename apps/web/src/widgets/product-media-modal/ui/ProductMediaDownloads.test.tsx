import { onlineManager } from '@tanstack/react-query'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { unzipSync } from 'fflate'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { productQueries } from '@/entities/product'

import { blobBytes, captureDownloads, waitForSingleDownload } from '../../../../test/downloads'
import { cardFixture, KNOWN_NM } from '../../../../test/msw/fixtures/wb'
import { server } from '../../../../test/msw/server'
import { renderWithProviders } from '../../../../test/render'

import { ProductMediaModal } from './ProductMediaModal'

const CARD_URL = 'https://basket-30.wbbasket.ru/vol6041/part604174/604174866/info/ru/card.json'
const PHOTO_PATTERN = /\/images\/big\/\d+\.webp$/

function renderModal(onClose: () => void = () => undefined) {
	return renderWithProviders(<ProductMediaModal productId={KNOWN_NM} onClose={onClose} />)
}

async function archiveNames(blob: Blob): Promise<string[]> {
	return Object.keys(unzipSync(await blobBytes(blob))).sort()
}

/** Holds photo responses until `release()` — lets tests act while a download is in flight. */
function stallPhotos() {
	let release!: () => void
	const released = new Promise<void>(resolve => {
		release = resolve
	})
	let requests = 0
	server.use(
		http.get(PHOTO_PATTERN, async () => {
			requests++
			await released
			return HttpResponse.arrayBuffer(new Uint8Array([1]).buffer)
		})
	)

	return { release, requests: () => requests }
}

const PAUSED_MESSAGE = 'Нет сети — загрузка начнётся после подключения'
const settle = () => new Promise(resolve => setTimeout(resolve, 50))

/** Counts CDN media requests without changing responses. */
function countMediaRequests() {
	const counter = { photos: 0, video: 0 }
	server.use(
		http.get(PHOTO_PATTERN, () => {
			counter.photos++
			return undefined
		}),
		http.get(/\/hls\//, () => {
			counter.video++
			return undefined
		})
	)

	return counter
}

const buttons = [
	{ name: 'photos', label: 'Скачать фото (3)', requests: 'photos' },
	{ name: 'video', label: 'Скачать видео', requests: 'video' }
] as const

describe('ProductMediaModal downloads', () => {
	afterEach(() => {
		onlineManager.setOnline(true)
	})

	describe.each(buttons)('$name while offline', ({ label, requests }) => {
		it('waits for the network and downloads after reconnect', async () => {
			const downloads = captureDownloads()
			const user = userEvent.setup()
			renderModal()

			const button = await screen.findByRole('button', { name: label })
			onlineManager.setOnline(false)
			await user.click(button)

			expect(await screen.findByText(PAUSED_MESSAGE)).toBeInTheDocument()
			expect(downloads).toHaveLength(0)

			act(() => {
				onlineManager.setOnline(true)
			})

			await waitForSingleDownload(downloads)
		})

		it('never downloads after the modal is closed during the pause', async () => {
			const downloads = captureDownloads()
			const counter = countMediaRequests()
			const user = userEvent.setup()
			const { rerender } = renderModal()

			const button = await screen.findByRole('button', { name: label })
			onlineManager.setOnline(false)
			await user.click(button)
			await screen.findByText(PAUSED_MESSAGE)

			rerender(<ProductMediaModal productId={null} onClose={() => undefined} />)
			act(() => {
				onlineManager.setOnline(true)
			})
			await settle()

			expect(downloads).toHaveLength(0)
			expect(counter[requests]).toBe(0)
		})

		it('cancel during the pause returns the button to idle right away', async () => {
			const downloads = captureDownloads()
			const counter = countMediaRequests()
			const user = userEvent.setup()
			renderModal()

			const button = await screen.findByRole('button', { name: label })
			onlineManager.setOnline(false)
			await user.click(button)
			await user.click(await screen.findByRole('button', { name: 'Отмена' }))

			// still offline: nothing is pending anymore (the hint collapses away)
			expect(screen.queryByRole('button', { name: 'Отмена' })).not.toBeInTheDocument()
			await waitFor(() => {
				expect(screen.queryByText(PAUSED_MESSAGE)).not.toBeInTheDocument()
			})
			expect(screen.getByRole('button', { name: label })).toBeEnabled()
			expect(screen.getByRole('button', { name: label })).not.toHaveAttribute('data-loading')

			act(() => {
				onlineManager.setOnline(true)
			})
			await settle()

			expect(downloads).toHaveLength(0)
			expect(counter[requests]).toBe(0)
			expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		})

		it('a new click after cancel during the pause downloads once', async () => {
			const downloads = captureDownloads()
			const user = userEvent.setup()
			renderModal()

			const button = await screen.findByRole('button', { name: label })
			onlineManager.setOnline(false)
			await user.click(button)
			await user.click(await screen.findByRole('button', { name: 'Отмена' }))
			await user.click(screen.getByRole('button', { name: label }))

			act(() => {
				onlineManager.setOnline(true)
			})

			await waitForSingleDownload(downloads)
			await settle()
			expect(downloads).toHaveLength(1)
		})
	})

	describe('photos', () => {
		it('downloads all photos as zip by default', async () => {
			const downloads = captureDownloads()
			const user = userEvent.setup()
			renderModal()

			await user.click(await screen.findByRole('button', { name: 'Скачать фото (3)' }))

			const download = await waitForSingleDownload(downloads)
			expect(download.filename).toBe(`wb-${KNOWN_NM}-photos.zip`)
			expect(await archiveNames(download.blob)).toEqual([
				`wb-${KNOWN_NM}-01.webp`,
				`wb-${KNOWN_NM}-02.webp`,
				`wb-${KNOWN_NM}-03.webp`
			])
		})

		it('confirms the saved archive', async () => {
			const downloads = captureDownloads()
			const user = userEvent.setup()
			renderModal()

			expect(screen.queryByRole('status')).not.toBeInTheDocument()
			await user.click(await screen.findByRole('button', { name: 'Скачать фото (3)' }))
			await waitForSingleDownload(downloads)

			expect(await screen.findByRole('status')).toHaveTextContent('Архив сохранён')
		})

		it('puts only selected photos into the archive', async () => {
			const downloads = captureDownloads()
			const user = userEvent.setup()
			renderModal()

			await user.click(await screen.findByRole('checkbox', { name: 'Фото 2' }))
			await user.click(screen.getByRole('button', { name: 'Скачать фото (2)' }))

			const download = await waitForSingleDownload(downloads)
			expect(await archiveNames(download.blob)).toEqual([`wb-${KNOWN_NM}-01.webp`, `wb-${KNOWN_NM}-03.webp`])
		})

		it('downloads files chosen at click even if the card changes while paused', async () => {
			const downloads = captureDownloads()
			const user = userEvent.setup()
			const { queryClient } = renderModal()

			await user.click(await screen.findByRole('checkbox', { name: 'Фото 1' }))
			await user.click(screen.getByRole('checkbox', { name: 'Фото 2' }))
			onlineManager.setOnline(false)
			await user.click(screen.getByRole('button', { name: 'Скачать фото (1)' }))
			await screen.findByText(PAUSED_MESSAGE)

			act(() => {
				queryClient.setQueryData(productQueries.detail(KNOWN_NM).queryKey, product => {
					if (!product) {
						return product
					}

					return { ...product, photos: product.photos.slice(0, 2) }
				})
			})
			await waitFor(() => {
				expect(screen.queryByRole('checkbox', { name: 'Фото 3' })).not.toBeInTheDocument()
			})

			act(() => {
				onlineManager.setOnline(true)
			})

			const download = await waitForSingleDownload(downloads)
			expect(await archiveNames(download.blob)).toEqual([`wb-${KNOWN_NM}-03.webp`])
		})

		it('disables download when nothing is selected', async () => {
			const user = userEvent.setup()
			renderModal()

			await user.click(await screen.findByRole('checkbox', { name: 'Выбрать все' }))

			expect(screen.getByRole('button', { name: 'Скачать фото' })).toBeDisabled()
		})

		it('shows progress and cancels without saving', async () => {
			const downloads = captureDownloads()
			const photos = stallPhotos()
			const user = userEvent.setup()
			renderModal()

			await user.click(await screen.findByRole('button', { name: 'Скачать фото (3)' }))
			expect(await screen.findByText('Загружено 0 из 3')).toBeInTheDocument()

			await user.click(screen.getByRole('button', { name: 'Отмена' }))
			photos.release()

			// The progress label fades out in place; the progressbar is gone right away
			await waitFor(() => {
				expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
			})
			expect(screen.getByRole('button', { name: 'Скачать фото (3)' })).not.toHaveAttribute('aria-busy')
			expect(downloads).toHaveLength(0)
			expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		})

		it('stops the download when the modal is closed', async () => {
			const downloads = captureDownloads()
			const photos = stallPhotos()
			const user = userEvent.setup()
			const { rerender } = renderModal()

			await user.click(await screen.findByRole('button', { name: 'Скачать фото (3)' }))
			await waitFor(() => {
				expect(photos.requests()).toBeGreaterThan(0)
			})

			rerender(<ProductMediaModal productId={null} onClose={() => undefined} />)
			photos.release()
			await new Promise(resolve => setTimeout(resolve, 20))

			expect(downloads).toHaveLength(0)
		})

		it('reports a photo that failed to download', async () => {
			captureDownloads()
			server.use(http.get(/\/images\/big\/2\.webp$/, () => new HttpResponse(null, { status: 404 })))
			const user = userEvent.setup()
			renderModal()

			await user.click(await screen.findByRole('button', { name: 'Скачать фото (3)' }))

			expect(await screen.findByRole('alert')).toHaveTextContent(
				`Не удалось скачать wb-${KNOWN_NM}-02.webp. Попробуйте ещё раз.`
			)
		})
	})

	describe('video', () => {
		it('downloads video as mp4 in the best available quality', async () => {
			const downloads = captureDownloads()
			const user = userEvent.setup()
			renderModal()

			await user.click(await screen.findByRole('button', { name: 'Скачать видео' }))

			const download = await waitForSingleDownload(downloads)
			expect(download.filename).toBe(`wb-${KNOWN_NM}-video-1440p.mp4`)
			expect(download.blob.type).toBe('video/mp4')
		})

		it('downloads video chosen at click even if the card changes while paused', async () => {
			const downloads = captureDownloads()
			const user = userEvent.setup()
			const { queryClient } = renderModal()

			const button = await screen.findByRole('button', { name: 'Скачать видео' })
			onlineManager.setOnline(false)
			await user.click(button)
			await screen.findByText(PAUSED_MESSAGE)

			act(() => {
				queryClient.setQueryData(productQueries.detail(KNOWN_NM).queryKey, product =>
					product ? { ...product, video: null } : product
				)
			})

			act(() => {
				onlineManager.setOnline(true)
			})

			const download = await waitForSingleDownload(downloads)
			expect(download.filename).toBe(`wb-${KNOWN_NM}-video-1440p.mp4`)
		})

		it('is disabled for a product without video', async () => {
			server.use(
				http.get(CARD_URL, () =>
					HttpResponse.json({ ...cardFixture, media: { ...cardFixture.media, has_video: false } })
				)
			)
			renderModal()

			expect(await screen.findByRole('button', { name: 'Скачать видео' })).toBeDisabled()
			expect(screen.getByText('У товара нет видео')).toBeInTheDocument()
		})

		it('does not save a truncated file when a segment is empty', async () => {
			const downloads = captureDownloads()
			server.use(http.get(/\/hls\/1440p\/1\.ts$/, () => new HttpResponse(new Uint8Array(0), { status: 200 })))
			const user = userEvent.setup()
			renderModal()

			await user.click(await screen.findByRole('button', { name: 'Скачать видео' }))

			expect(await screen.findByRole('alert')).toHaveTextContent('Видео на CDN повреждено, файл не сохранён.')
			expect(downloads).toHaveLength(0)
		})

		it('explains when video is missing on CDN', async () => {
			captureDownloads()
			server.use(http.get(/\/hls\/\w+\/index\.m3u8$/, () => new HttpResponse(null, { status: 404 })))
			const user = userEvent.setup()
			renderModal()

			await user.click(await screen.findByRole('button', { name: 'Скачать видео' }))

			expect(await screen.findByRole('alert')).toHaveTextContent('Видео недоступно на CDN.')
		})
	})
})
