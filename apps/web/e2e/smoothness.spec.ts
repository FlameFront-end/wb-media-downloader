import type { Page } from '@playwright/test'

import { cardFixture, expect, KNOWN_NM, test } from './fixtures.ts'

const LONG_PRODUCT_NAME = 'Очень длинное название товара для проверки переноса заголовка в галерее на узком экране'
const CARD_URL = new RegExp(`/${KNOWN_NM}/info/ru/card\\.json$`)

const submitButton = (page: Page) => page.getByRole('button', { name: 'Найти товар', exact: true })

async function submitArticle(page: Page) {
	await page.getByLabel('Артикул или ссылка WB').fill(String(KNOWN_NM))
	await submitButton(page).click()
}

/** Waits for the modal's open transition and the gallery fade; the endless skeleton pulse is skipped. */
async function animationsSettled(page: Page) {
	await page.getByRole('dialog').evaluate(async dialog => {
		await Promise.allSettled(
			dialog
				.getAnimations({ subtree: true })
				.filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
				.map(animation => animation.finished)
		)
	})
}

/** Holds a route until the test lets it through. */
async function holdRoute(page: Page, url: string | RegExp) {
	let release!: () => void
	const released = new Promise<void>(resolve => {
		release = resolve
	})
	await page.route(url, async route => {
		await released
		await route.fallback()
	})
	return release
}

test.describe('modal transition', () => {
	for (const width of [390, 1280]) {
		test(`animates on the first opening at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 800 })
			await page.goto('/')
			await page.evaluate(() => {
				document.addEventListener('transitionrun', event => {
					if (event.propertyName === 'transform' && event.target instanceof HTMLElement) {
						if (event.target.getAttribute('role') === 'dialog') {
							event.target.dataset.entranceAnimated = 'true'
						}
					}
				})
			})
			await submitArticle(page)

			const dialog = page.getByRole('dialog')
			await expect(dialog).toHaveAttribute('data-entrance-animated', 'true')
			await expect(dialog).toHaveCSS('opacity', '1')
		})
	}

	test.describe('with reduced motion', () => {
		test.use({ reducedMotion: 'reduce' })

		test('disables motion in the modal, skeleton and download progress', async ({ page }) => {
			const releaseCard = await holdRoute(page, CARD_URL)
			const releasePhotos = await holdRoute(page, '**/images/big/**')
			await page.goto('/')
			await submitArticle(page)

			const dialog = page.getByRole('dialog')
			const tile = dialog.getByTestId('gallery-tile-skeleton')
			await expect(dialog).toHaveCSS('transition-duration', '0s')
			await expect(tile).toBeVisible()
			expect(await tile.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0)

			releaseCard()
			await dialog.getByRole('button', { name: 'Скачать фото (3)' }).click()
			const progress = dialog.getByRole('progressbar', { name: 'Прогресс скачивания фото' })
			await expect(progress).toHaveCSS('transition-duration', '0s')
			await dialog.getByRole('button', { name: 'Отмена' }).click()
			releasePhotos()
		})
	})
})

for (const [device, viewport] of [
	['narrow phone', { width: 320, height: 780 }],
	['phone', { width: 390, height: 780 }],
	['desktop', { width: 1280, height: 800 }]
] as const) {
	test(`the loaded gallery takes the place of its skeleton without a jump on ${device}`, async ({ page }) => {
		await page.setViewportSize(viewport)
		await page.route(CARD_URL, route =>
			route.fulfill({
				json: { ...cardFixture, imt_name: LONG_PRODUCT_NAME },
				headers: { 'Access-Control-Allow-Origin': '*' }
			})
		)
		const releaseCard = await holdRoute(page, CARD_URL)
		await page.goto('/')
		await submitArticle(page)

		const skeletonTile = page.getByTestId('gallery-tile-skeleton').first()
		await expect(skeletonTile).toBeVisible()
		await animationsSettled(page)
		const placeholder = await skeletonTile.boundingBox()
		const buttonPlaceholders = await page
			.getByTestId('download-button-skeleton')
			.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON() as DOMRect))

		releaseCard()
		const dialog = page.getByRole('dialog')
		await expect(dialog.getByRole('heading', { name: LONG_PRODUCT_NAME })).toBeVisible()
		await animationsSettled(page)
		const tile = await dialog
			.locator('label')
			.filter({ has: page.getByRole('checkbox', { name: 'Фото 1', exact: true }) })
			.boundingBox()

		expect(placeholder).not.toBeNull()
		expect(tile).not.toBeNull()
		for (const side of ['x', 'y', 'width', 'height'] as const) {
			expect(Math.abs((tile?.[side] ?? 0) - (placeholder?.[side] ?? 0)), side).toBeLessThanOrEqual(1)
		}

		// Download buttons land exactly on their placeholders, the right one included
		const buttons = await Promise.all([
			dialog.getByRole('button', { name: /^Скачать фото/ }).boundingBox(),
			dialog.getByRole('button', { name: 'Скачать видео' }).boundingBox()
		])
		expect(buttonPlaceholders).toHaveLength(2)
		buttons.forEach((button, index) => {
			for (const side of ['x', 'y', 'width', 'height'] as const) {
				expect(
					Math.abs((button?.[side] ?? 0) - (buttonPlaceholders[index]?.[side] ?? 0)),
					`button ${index} ${side}`
				).toBeLessThanOrEqual(1)
			}
		})
	})
}

test('the submit button spins while the modal chunk is on its way', async ({ page }) => {
	const releaseChunk = await holdRoute(page, '**/assets/product-media-modal-*.js')
	await page.goto('/')
	await submitArticle(page)

	await expect(submitButton(page)).toHaveAttribute('data-loading')
	await expect(page.getByRole('dialog')).toHaveCount(0)

	releaseChunk()

	await expect(page.getByRole('dialog').getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
	await expect(submitButton(page)).not.toHaveAttribute('data-loading')
})

test.describe('focus returns where the modal was opened from', () => {
	test('the input, when submitted with Enter', async ({ page }) => {
		await page.goto('/')
		const input = page.getByLabel('Артикул или ссылка WB')
		await input.fill(String(KNOWN_NM))
		await input.press('Enter')
		await expect(page.getByRole('dialog').getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()

		await page.keyboard.press('Escape')

		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(input).toBeFocused()
	})

	test('the button, when clicked', async ({ page }) => {
		await page.goto('/')
		await submitArticle(page)
		await expect(page.getByRole('dialog').getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()

		await page.keyboard.press('Escape')

		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(submitButton(page)).toBeFocused()
	})
})

test('progress and the saved message play inside the button without moving it', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 780 })
	const releasePhotos = await holdRoute(page, '**/images/big/**')
	await page.goto('/')
	await submitArticle(page)
	const dialog = page.getByRole('dialog')
	const button = dialog.getByRole('button', { name: 'Скачать фото (3)' })
	const footer = dialog.locator('[class*=footer]').first()
	await expect(dialog).toHaveCSS('opacity', '1')
	await animationsSettled(page)
	const idle = await Promise.all([button.boundingBox(), footer.boundingBox()])

	await button.click()
	await expect(button.getByText('Загружено 0 из 3', { exact: true })).toBeVisible()
	await expect(dialog.getByRole('progressbar', { name: 'Прогресс скачивания фото' })).toHaveAttribute(
		'aria-valuetext',
		'Загружено 0 из 3'
	)
	await animationsSettled(page)
	expect(await Promise.all([button.boundingBox(), footer.boundingBox()])).toEqual(idle)

	const downloaded = page.waitForEvent('download')
	releasePhotos()
	await downloaded

	await expect(dialog.getByRole('status')).toHaveText('Архив сохранён')
	await expect(button.getByText('Архив сохранён')).toHaveCSS('opacity', '1')
	expect(await Promise.all([button.boundingBox(), footer.boundingBox()])).toEqual(idle)

	await expect(dialog.getByRole('status')).toHaveCount(0, { timeout: 6000 })
	await expect(button.getByText('Скачать фото (3)')).toHaveCSS('opacity', '1')
	expect(await Promise.all([button.boundingBox(), footer.boundingBox()])).toEqual(idle)
})

test('download controls and the progress label fit a 320px screen', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 780 })
	const releasePhotos = await holdRoute(page, '**/images/big/**')
	await page.goto('/')
	await submitArticle(page)
	const dialog = page.getByRole('dialog')
	const photos = dialog.getByRole('button', { name: 'Скачать фото (3)' })
	const video = dialog.getByRole('button', { name: 'Скачать видео' })

	await expect(dialog).toHaveCSS('opacity', '1')
	await expect(photos).toBeVisible()
	await expect(video).toBeVisible()
	const clearance = await photos.evaluate(photo => {
		const videoButton = photo.closest('[role=dialog]')?.querySelector('[aria-label="Скачать видео"]')
		return videoButton ? videoButton.getBoundingClientRect().top - photo.getBoundingClientRect().bottom : null
	})
	expect(clearance).not.toBeNull()
	expect(clearance ?? -1).toBeGreaterThanOrEqual(0)

	await photos.click()
	const progress = dialog.getByText('Загружено 0 из 3', { exact: true })
	const cancel = dialog.getByRole('button', { name: 'Отмена' })
	const labelRight = await progress.evaluate(label => {
		const range = document.createRange()
		range.selectNodeContents(label)
		return range.getBoundingClientRect().right
	})
	const cancelBox = await cancel.boundingBox()
	if (!cancelBox) {
		throw new Error('The cancel button must have a visible bounding box')
	}
	expect(labelRight).toBeLessThanOrEqual(cancelBox.x)

	await cancel.focus()
	await page.keyboard.press('Enter')
	await expect(photos).toBeFocused()
	releasePhotos()
})

test('closing the modal keeps the gallery in place during the exit transition', async ({ page }) => {
	await page.goto('/')
	await submitArticle(page)
	const dialog = page.getByRole('dialog')
	await expect(dialog.getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
	await animationsSettled(page)

	const galleryDuringExit = await dialog.evaluate(node => {
		node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
		return new Promise<boolean>(resolve => {
			requestAnimationFrame(() => {
				resolve(Boolean(node.querySelector('[inert] input[type=checkbox]')))
			})
		})
	})

	expect(galleryDuringExit).toBe(true)
	await expect(dialog).toHaveCount(0)
})

test('explains the offline pause and resumes without shifting the skeleton', async ({ page, context }) => {
	const releaseCard = await holdRoute(page, CARD_URL)
	await page.goto('/')
	await page.getByLabel('Артикул или ссылка WB').focus()
	await page.waitForFunction(() =>
		performance.getEntriesByType('resource').some(entry => /product-media-modal-.*\.js$/.test(entry.name))
	)
	await context.setOffline(true)

	await submitArticle(page)
	const dialog = page.getByRole('dialog')
	await expect(dialog.getByRole('status')).toContainText('Загрузка карточки продолжится после подключения.')
	const skeleton = dialog.getByTestId('gallery-tile-skeleton')
	await expect(skeleton).toBeVisible()
	await expect(dialog).toHaveCSS('opacity', '1')
	const beforeReconnect = await skeleton.boundingBox()
	await context.setOffline(false)
	await expect(dialog.getByRole('status')).toHaveCount(0)
	expect(await skeleton.boundingBox()).toEqual(beforeReconnect)
	releaseCard()
	await expect(dialog.getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
})

test('download errors stack above both buttons on a narrow screen and return focus when dismissed', async ({
	page
}) => {
	await page.setViewportSize({ width: 320, height: 780 })
	await page.route('**/images/big/2.webp', route => route.fulfill({ status: 503 }))
	await page.route('**/index.m3u8', route => route.fulfill({ status: 404 }))
	await page.goto('/')
	await submitArticle(page)
	const dialog = page.getByRole('dialog')
	const footer = dialog.locator('[class*=footer]').first()
	await expect(dialog).toHaveCSS('opacity', '1')
	await animationsSettled(page)
	const before = await footer.boundingBox()

	const video = dialog.getByRole('button', { name: 'Скачать видео' })
	await video.click()
	const videoError = dialog.getByRole('alert').filter({ hasText: 'Видео недоступно' })
	await expect(videoError).toBeVisible()

	await dialog.getByRole('button', { name: 'Скачать фото (3)' }).click()
	const photoError = dialog.getByRole('alert').filter({ hasText: 'Не удалось скачать' })
	await expect(photoError).toBeVisible()
	await animationsSettled(page)
	const [photoBox, videoBox, after] = await Promise.all([
		photoError.boundingBox(),
		videoError.boundingBox(),
		footer.boundingBox()
	])
	expect(after).toEqual(before)
	if (!photoBox || !videoBox || !after) {
		throw new Error('Both errors and the download bar must be visible')
	}
	expect(Math.max(photoBox.y + photoBox.height, videoBox.y + videoBox.height)).toBeLessThanOrEqual(after.y)
	expect(photoBox.y + photoBox.height <= videoBox.y || videoBox.y + videoBox.height <= photoBox.y).toBe(true)

	await videoError.getByRole('button', { name: 'Скрыть ошибку' }).focus()
	await page.keyboard.press('Enter')
	await expect(videoError).toHaveCount(0)
	await expect(video).toBeFocused()
	await expect(photoError).toBeVisible()
	expect(await footer.boundingBox()).toEqual(before)
})
