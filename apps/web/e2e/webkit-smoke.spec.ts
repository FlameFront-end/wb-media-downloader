import { readFile } from 'node:fs/promises'

import { unzipSync } from 'fflate'

import { cardFixture, expect, KNOWN_NM, photoBytes, test } from './fixtures.ts'
import { inspectMp4 } from './mp4.ts'

test('downloads selected photos and video in mobile WebKit', async ({ page }) => {
	await page.goto('/')
	await page.getByLabel('Артикул или ссылка WB').fill(`https://www.wildberries.ru/catalog/${KNOWN_NM}/detail.aspx`)
	await page.getByRole('button', { name: 'Найти товар' }).click()

	const dialog = page.getByRole('dialog')
	await expect(dialog.getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
	await dialog.getByRole('checkbox', { name: 'Выбрать все' }).uncheck()
	await dialog.getByRole('checkbox', { name: 'Фото 1', exact: true }).check()

	const [zip] = await Promise.all([
		page.waitForEvent('download'),
		dialog.getByRole('button', { name: 'Скачать фото (1)' }).click()
	])
	expect(zip.suggestedFilename()).toBe(`wb-${KNOWN_NM}-photos.zip`)
	expect(unzipSync(await readFile(await zip.path()))).toEqual({ [`wb-${KNOWN_NM}-01.webp`]: photoBytes(1) })

	const [video] = await Promise.all([
		page.waitForEvent('download'),
		dialog.getByRole('button', { name: 'Скачать видео' }).click()
	])
	expect(video.suggestedFilename()).toBe(`wb-${KNOWN_NM}-video-1440p.mp4`)
	expect(inspectMp4(await readFile(await video.path())).trackCount).toBe(2)
})
