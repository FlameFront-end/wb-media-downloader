import type { Page } from '@playwright/test'

import { cardFixture, expect, KNOWN_NM, test } from './fixtures.ts'

const PHOTO_COUNT = 14
const PHONE = { width: 390, height: 780 }
const DESKTOP = { width: 1280, height: 800 }

async function openLongGallery(page: Page, viewport: { width: number; height: number }) {
	await page.setViewportSize(viewport)
	await page.route(new RegExp(`/${KNOWN_NM}/info/ru/card\\.json$`), route =>
		route.fulfill({
			json: { ...cardFixture, media: { ...cardFixture.media, photo_count: PHOTO_COUNT } },
			headers: { 'Access-Control-Allow-Origin': '*' }
		})
	)
	await page.goto('/')
	await page.getByLabel('Артикул или ссылка WB').fill(String(KNOWN_NM))
	await page.getByRole('button', { name: 'Скачать фото' }).click()

	const dialog = page.getByRole('dialog')
	await expect(dialog.getByRole('checkbox', { name: /^Фото \d+$/ })).toHaveCount(PHOTO_COUNT)
	return dialog
}

for (const [device, viewport] of [
	['phone', PHONE],
	['desktop', DESKTOP]
] as const) {
	test(`download buttons stay in view while scrolling a long gallery on ${device}`, async ({ page }) => {
		const dialog = await openLongGallery(page, viewport)

		// A photo in the middle: without the sticky bar the buttons are far below it
		const photo = dialog.getByRole('checkbox', { name: 'Фото 7', exact: true })
		await photo.scrollIntoViewIfNeeded()
		await photo.uncheck()

		await expect(dialog.getByRole('button', { name: `Скачать фото (${PHOTO_COUNT - 1})` })).toBeInViewport()
		await expect(dialog.getByRole('button', { name: 'Скачать видео' })).toBeInViewport()
		await expect(photo).toBeInViewport()
		await expect(photo).not.toBeChecked()
	})
}

test('keyboard focus is never hidden under the download bar', async ({ page }) => {
	const dialog = await openLongGallery(page, PHONE)
	const downloadButton = dialog.getByRole('button', { name: /^Скачать фото/ })
	await dialog.getByRole('checkbox', { name: 'Выбрать все' }).focus()

	for (let index = 1; index <= PHOTO_COUNT; index++) {
		await page.keyboard.press('Tab')
		const checkbox = dialog.getByRole('checkbox', { name: `Фото ${index}`, exact: true })
		await expect(checkbox).toBeFocused()

		const [focused, bar] = await Promise.all([checkbox.boundingBox(), downloadButton.boundingBox()])
		expect(focused && bar && focused.y + focused.height <= bar.y, `Фото ${index} is above the bar`).toBe(true)
	}
})
