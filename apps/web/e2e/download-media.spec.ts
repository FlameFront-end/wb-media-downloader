import { readFile } from 'node:fs/promises'

import type { Download, Page } from '@playwright/test'
import { unzipSync } from 'fflate'

import { PLAYLIST_DURATION_SECONDS, segmentFixtures } from '../test/msw/fixtures/hls.ts'

import { cardFixture, expect, KNOWN_NM, photoBytes, test } from './fixtures.ts'
import { inspectMp4 } from './mp4.ts'

async function openGallery(page: Page) {
	await page.goto('/')
	await page.getByLabel('Артикул').fill(String(KNOWN_NM))
	await page.getByRole('button', { name: 'Скачать фото' }).click()

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
		[`wb-${KNOWN_NM}-01.webp`]: photoBytes(KNOWN_NM, 1),
		[`wb-${KNOWN_NM}-03.webp`]: photoBytes(KNOWN_NM, 3)
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
