import { readFile } from 'node:fs/promises'

import type { Download, Page } from '@playwright/test'
import { unzipSync } from 'fflate'

import { PLAYLIST_DURATION_SECONDS, segmentFixtures } from '../test/msw/fixtures/hls.ts'

import { cardFixture, expect, KNOWN_NM, photoBytes, test } from './fixtures.ts'
import { inspectMp4 } from './mp4.ts'

async function openGallery(page: Page) {
	await page.goto('/')
	await page.getByLabel('Артикул или ссылка WB').fill(String(KNOWN_NM))
	await page.getByRole('button', { name: 'Найти товар' }).click()

	const dialog = page.getByRole('dialog')
	await expect(dialog.getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
	return dialog
}

async function downloaded(download: Download): Promise<Uint8Array> {
	expect(await download.failure()).toBeNull()
	return new Uint8Array(await readFile(await download.path()))
}

test('downloads selected photos as a zip', async ({ page }) => {
	const dialog = await openGallery(page)
	const photos = dialog.getByRole('checkbox', { name: /^Фото \d+$/ })
	await expect(photos).toHaveCount(cardFixture.media.photo_count)
	await expect(dialog.getByRole('checkbox', { name: 'Выбрать все' })).toBeChecked()

	await dialog.getByRole('checkbox', { name: 'Фото 2' }).uncheck()

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		dialog.getByRole('button', { name: 'Скачать фото (2)' }).click()
	])

	expect(download.suggestedFilename()).toBe(`wb-${KNOWN_NM}-photos.zip`)
	// Exact match: every selected original with its own bytes, nothing extra
	expect(unzipSync(await downloaded(download))).toEqual({
		[`wb-${KNOWN_NM}-01.webp`]: photoBytes(1),
		[`wb-${KNOWN_NM}-03.webp`]: photoBytes(3)
	})
})

test('downloads the video as a playable mp4', async ({ page }) => {
	const dialog = await openGallery(page)

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		dialog.getByRole('button', { name: 'Скачать видео' }).click()
	])

	expect(download.suggestedFilename()).toBe(`wb-${KNOWN_NM}-video-1440p.mp4`)
	const { boxes, trackCount, durationSeconds } = inspectMp4(await downloaded(download))
	// The fixture is H.264 + AAC: both tracks must survive the remux
	expect(trackCount).toBe(2)
	// Init segment, then a moof/mdat pair per track for every TS segment: a dropped segment changes the layout
	const fragmentCount = Object.keys(segmentFixtures).length * trackCount
	expect(boxes).toEqual(['ftyp', 'moov', ...Array.from({ length: fragmentCount }, () => ['moof', 'mdat']).flat()])
	expect(durationSeconds).toBeCloseTo(PLAYLIST_DURATION_SECONDS, 1)
})

test('shows incoming bytes without moving the controls and retries a stalled segment', async ({ page }) => {
	await page.setViewportSize({ width: 414, height: 780 })
	await page.clock.install()
	await page.addInitScript(() => {
		const fetchOtherwise = window.fetch.bind(window)
		let attempts = 0
		window.fetch = async (input, options) => {
			if (typeof input !== 'string' || !input.endsWith('/1440p/0.ts') || ++attempts > 1) {
				return fetchOtherwise(input, options)
			}

			return new Response(
				new ReadableStream({
					start(controller) {
						const firstBytes = () => {
							controller.enqueue(new Uint8Array(64 * 1024))
						}
						document.addEventListener('first-video-bytes', firstBytes, { once: true })
						const moreBytes = window.setTimeout(() => {
							controller.enqueue(new Uint8Array(64 * 1024))
						}, 8000)
						options?.signal?.addEventListener(
							'abort',
							() => {
								document.removeEventListener('first-video-bytes', firstBytes)
								window.clearTimeout(moreBytes)
								controller.error(new DOMException('Aborted', 'AbortError'))
							},
							{ once: true }
						)
					}
				})
			)
		}
	})
	const dialog = await openGallery(page)
	const videoButton = dialog.getByRole('button', { name: 'Скачать видео' })
	const cancel = dialog.getByRole('button', { name: 'Отмена' })
	await videoButton.click()
	await expect(dialog.getByText('0 из 2', { exact: true })).toBeVisible()
	await expect(dialog).toHaveCSS('opacity', '1')
	await videoButton.evaluate(async button => {
		const control = button.parentElement
		const finiteAnimations = control
			?.getAnimations({ subtree: true })
			.filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
		await Promise.allSettled(finiteAnimations?.map(animation => animation.finished) ?? [])
	})
	const before = await Promise.all([videoButton.boundingBox(), cancel.boundingBox()])
	await page.evaluate(() => {
		document.dispatchEvent(new Event('first-video-bytes'))
	})
	await expect(dialog.getByText('0 из 2 · 64 КБ')).toBeVisible()
	expect(await Promise.all([videoButton.boundingBox(), cancel.boundingBox()])).toEqual(before)
	await page.clock.runFor(8100)
	await expect(dialog.getByText('0 из 2 · 128 КБ')).toBeVisible()
	await page.clock.fastForward(5000)
	await expect(dialog.getByText('0 из 2 · 128 КБ')).toBeVisible()

	const [download] = await Promise.all([page.waitForEvent('download'), page.clock.fastForward(12_100)])
	expect(inspectMp4(await downloaded(download)).durationSeconds).toBeCloseTo(PLAYLIST_DURATION_SECONDS, 1)
})

test('explains a missing preview and still lets the user download the original', async ({ page }) => {
	// The CDN fixture serves the originals and responds with 404 for preview requests.
	const dialog = await openGallery(page)
	const tile = dialog.locator('label').filter({ has: page.getByRole('checkbox', { name: 'Фото 1', exact: true }) })
	await expect(tile.getByText('Превью недоступно')).toBeVisible()

	const all = dialog.getByRole('checkbox', { name: 'Выбрать все' })
	await all.uncheck()
	await tile.getByRole('checkbox').check()

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		dialog.getByRole('button', { name: 'Скачать фото (1)' }).click()
	])
	expect(unzipSync(await downloaded(download))).toEqual({
		[`wb-${KNOWN_NM}-01.webp`]: photoBytes(1)
	})
})

test('reports a bad original and does not save an archive with HTML', async ({ page }) => {
	await page.route('**/images/big/2.webp', route =>
		route.fulfill({ status: 200, contentType: 'text/html', body: '<html>CDN error</html>' })
	)
	const dialog = await openGallery(page)
	let downloads = 0
	page.on('download', () => {
		downloads++
	})
	await dialog.getByRole('button', { name: 'Скачать фото (3)' }).click()
	await expect(dialog.getByRole('alert')).toContainText('CDN вернул повреждённое фото')
	await expect(dialog.getByRole('alert')).toContainText(`wb-${KNOWN_NM}-02.webp`)
	expect(downloads).toBe(0)
})
