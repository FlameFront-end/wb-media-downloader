import { cardFixture, expect, KNOWN_NM, test } from './fixtures.ts'

for (const [width, stacked] of [
	[320, true],
	[1280, false]
] as const) {
	test(`the form fits at ${width}px and the gallery has a named close button`, async ({ page }) => {
		await page.setViewportSize({ width, height: 780 })
		await page.goto('/')

		const input = page.getByRole('textbox', { name: 'Артикул или ссылка WB' })
		const submit = page.getByRole('button', { name: 'Найти товар', exact: true })
		await expect(input).toHaveAttribute('inputmode', 'url')
		const inputBox = await input.boundingBox()
		const submitBox = await submit.boundingBox()
		if (!inputBox || !submitBox) {
			throw new Error('The input and submit button must be visible')
		}
		if (stacked) {
			expect(submitBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height)
			expect(submitBox.width).toBeCloseTo(inputBox.width, 0)
		} else {
			expect(submitBox.x).toBeGreaterThanOrEqual(inputBox.x + inputBox.width)
		}

		await input.fill(`https://www.wildberries.ru/catalog/${KNOWN_NM}/detail.aspx`)
		await input.press('Enter')
		const dialog = page.getByRole('dialog')
		await expect(dialog.getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
		await dialog.getByRole('button', { name: 'Закрыть галерею' }).click()
		await expect(dialog).toHaveCount(0)
		await expect(input).toBeFocused()
	})
}
