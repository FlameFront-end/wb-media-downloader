import type { Page } from '@playwright/test'

import { cardFixture, expect, KNOWN_NM, test } from './fixtures.ts'

const LONG_PRODUCT_NAME = 'Очень длинное название товара для проверки переноса заголовка в галерее на узком экране'
const CARD_URL = new RegExp(`/${KNOWN_NM}/info/ru/card\\.json$`)

const submitButton = (page: Page) => page.getByRole('button', { name: 'Скачать фото', exact: true })

async function submitArticle(page: Page) {
	await page.getByLabel('Артикул').fill(String(KNOWN_NM))
	await submitButton(page).click()
}

/** Waits for the modal's open transition and the gallery fade; the endless skeleton pulse is skipped. */
async function animationsSettled(page: Page) {
	await page.getByRole('dialog').evaluate(dialog =>
		Promise.all(
			dialog
				.getAnimations({ subtree: true })
				.filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
				.map(animation => animation.finished)
		)
	)
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
	test('opens with a short transition', async ({ page }) => {
		await page.goto('/')
		await submitArticle(page)

		await expect(page.getByRole('dialog')).toHaveCSS('transition-duration', '0.2s')
	})

	test.describe('with reduced motion', () => {
		test.use({ reducedMotion: 'reduce' })

		test('opens instantly', async ({ page }) => {
			await page.goto('/')
			await submitArticle(page)

			await expect(page.getByRole('dialog')).toHaveCSS('transition-duration', '0s')
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
		const input = page.getByLabel('Артикул')
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

test('a finished download says the file was saved', async ({ page }) => {
	await page.goto('/')
	await submitArticle(page)
	const dialog = page.getByRole('dialog')

	await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Скачать фото (3)' }).click()])

	await expect(dialog.getByRole('status')).toHaveText('Архив сохранён')
	await expect(dialog.getByRole('status')).toHaveCount(0, { timeout: 6000 })
})

test('download controls and the progress label fit a 320px screen', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 780 })
	const releasePhotos = await holdRoute(page, '**/images/big/**')
	await page.goto('/')
	await submitArticle(page)
	const dialog = page.getByRole('dialog')
	const photos = dialog.getByRole('button', { name: 'Скачать фото (3)' })
	const video = dialog.getByRole('button', { name: 'Скачать видео' })

	const photoBox = await photos.boundingBox()
	const videoBox = await video.boundingBox()
	if (!photoBox || !videoBox) {
		throw new Error('Both download buttons must have a visible bounding box')
	}
	expect(videoBox.y).toBeGreaterThanOrEqual(photoBox.y + photoBox.height)

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

	await cancel.click()
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
