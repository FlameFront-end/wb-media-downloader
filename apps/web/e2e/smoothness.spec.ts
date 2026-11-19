import type { Page } from '@playwright/test'

import { cardFixture, expect, KNOWN_NM, test } from './fixtures.ts'

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
	['phone', { width: 390, height: 780 }],
	['desktop', { width: 1280, height: 800 }]
] as const) {
	test(`the loaded gallery takes the place of its skeleton without a jump on ${device}`, async ({ page }) => {
		await page.setViewportSize(viewport)
		const releaseCard = await holdRoute(page, CARD_URL)
		await page.goto('/')
		await submitArticle(page)

		const skeletonTile = page.getByTestId('gallery-tile-skeleton').first()
		await expect(skeletonTile).toBeVisible()
		await animationsSettled(page)
		const placeholder = await skeletonTile.boundingBox()

		releaseCard()
		const dialog = page.getByRole('dialog')
		await expect(dialog.getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
		await animationsSettled(page)
		const tile = await dialog
			.locator('label')
			.filter({ has: page.getByRole('checkbox', { name: 'Фото 1' }) })
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
