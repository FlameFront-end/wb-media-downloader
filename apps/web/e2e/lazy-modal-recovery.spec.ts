import type { Page } from '@playwright/test'

import { cardFixture, expect, KNOWN_NM, test } from './fixtures.ts'

const MODAL_CHUNK = '**/assets/product-media-modal-*.js'

async function openArticle(page: Page) {
	await page.getByLabel('Артикул или ссылка WB').fill(String(KNOWN_NM))
	await page.getByRole('button', { name: 'Найти товар' }).click()
}

const gallery = (page: Page) => page.getByRole('dialog').getByRole('heading', { name: cardFixture.imt_name })
const loadError = (page: Page) => page.getByRole('alert').filter({ hasText: 'Не удалось загрузить галерею' })
const reloadButton = (page: Page) => loadError(page).getByRole('button', { name: 'Перезагрузить страницу' })

test.describe('modal chunk failure', () => {
	test.beforeEach(async ({ page }) => {
		await page.route(MODAL_CHUNK, route => route.abort('internetdisconnected'))
		await page.goto('/')
	})

	test('failed preload is silent, opening shows an inline error with a reload offer', async ({ page }) => {
		const chunkFailed = page.waitForEvent('requestfailed', request =>
			request.url().includes('product-media-modal-')
		)
		await page.getByLabel('Артикул или ссылка WB').focus()
		await chunkFailed
		await expect(page.getByRole('alert')).toHaveCount(0)

		await openArticle(page)

		await expect(reloadButton(page)).toBeVisible()
		await expect(page.getByText('Что-то пошло не так')).toHaveCount(0)
		await expect(page.getByLabel('Артикул или ссылка WB')).toBeEditable()
	})

	test('page reload recovers once the network is back', async ({ page }) => {
		await openArticle(page)
		await expect(loadError(page)).toBeVisible()

		// The network is back, but the failed import is not retried in place: only a reload helps
		await page.unroute(MODAL_CHUNK)
		await loadError(page).getByRole('button', { name: 'Закрыть' }).click()
		await expect(loadError(page)).toHaveCount(0)
		await page.getByRole('button', { name: 'Найти товар' }).click()
		await expect(reloadButton(page)).toBeVisible()

		await Promise.all([page.waitForEvent('load'), reloadButton(page).click()])
		await openArticle(page)

		await expect(gallery(page)).toBeVisible()
	})
})
