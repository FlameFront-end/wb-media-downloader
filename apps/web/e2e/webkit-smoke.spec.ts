import { readFile } from 'node:fs/promises'

import { unzipSync } from 'fflate'

import { cardFixture, expect, KNOWN_NM, photoBytes, test } from './fixtures.ts'
import { inspectMp4 } from './mp4.ts'

test('downloads photos and video and can save prepared files offline in mobile WebKit', async ({ page, context }) => {
	await page.goto('/')
	await page.getByLabel('Артикул или ссылка WB').fill(`https://www.wildberries.ru/catalog/${KNOWN_NM}/detail.aspx`)
	await page.getByRole('button', { name: 'Найти товар' }).click()

	const dialog = page.getByRole('dialog')
	await expect(dialog.getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
	await dialog.getByRole('checkbox', { name: 'Выбрать все' }).uncheck()
	await dialog.getByRole('checkbox', { name: 'Фото 1', exact: true }).check()

	const photosButton = dialog.getByRole('button', { name: 'Скачать фото (1)' })
	const [zip] = await Promise.all([page.waitForEvent('download'), photosButton.click()])
	expect(zip.suggestedFilename()).toBe(`wb-${KNOWN_NM}-photos.zip`)
	const archiveBytes = await readFile(await zip.path())
	expect(unzipSync(archiveBytes)).toEqual({ [`wb-${KNOWN_NM}-01.webp`]: photoBytes(1) })

	const videoButton = dialog.getByRole('button', { name: 'Скачать видео' })
	const [video] = await Promise.all([page.waitForEvent('download'), videoButton.click()])
	expect(video.suggestedFilename()).toBe(`wb-${KNOWN_NM}-video-1440p.mp4`)
	const bytes = await readFile(await video.path())
	expect(inspectMp4(bytes).trackCount).toBe(2)

	await expect(videoButton).toBeEnabled()
	await context.setOffline(true)
	const [repeatedZip] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), photosButton.click()])
	expect(repeatedZip.suggestedFilename()).toBe(zip.suggestedFilename())
	expect(await readFile(await repeatedZip.path())).toEqual(archiveBytes)

	const [repeated] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), videoButton.click()])
	expect(repeated.suggestedFilename()).toBe(video.suggestedFilename())
	expect(await readFile(await repeated.path())).toEqual(bytes)

	// Keeping the same count but selecting another photo must build a different ZIP.
	await context.setOffline(false)
	await dialog.getByRole('checkbox', { name: 'Фото 1', exact: true }).uncheck()
	await dialog.getByRole('checkbox', { name: 'Фото 2', exact: true }).check()
	const [updatedZip] = await Promise.all([page.waitForEvent('download'), photosButton.click()])
	expect(unzipSync(await readFile(await updatedZip.path()))).toEqual({ [`wb-${KNOWN_NM}-02.webp`]: photoBytes(2) })
})
