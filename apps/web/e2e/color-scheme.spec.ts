import { expect, test } from './fixtures.ts'

test.describe('theme before the application bundle runs', () => {
	test.use({ colorScheme: 'dark' })

	test.beforeEach(async ({ page }) => {
		await page.route('**/assets/index-*.{js,css}', route => route.abort())
	})

	test('uses the system theme when storage is unavailable', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(window, 'localStorage', {
				get() {
					throw new DOMException('Storage blocked', 'SecurityError')
				}
			})
		})
		await page.goto('/')

		await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark')
		await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 36, 36)')
	})

	test('honors a saved light preference on a dark system', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('mantine-color-scheme-value', 'light')
		})
		await page.goto('/')

		await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'light')
		await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
	})
})
