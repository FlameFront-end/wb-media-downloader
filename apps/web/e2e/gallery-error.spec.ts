import { cardFixture, expect, KNOWN_NM, test } from './fixtures.ts'

test('a card retry waits offline without spinning and resumes on reconnect', async ({ page, context }) => {
	await page.route(`**/${KNOWN_NM}/info/ru/card.json`, route => route.fulfill({ status: 403 }), { times: 1 })
	await page.goto('/')
	await page.getByLabel('Артикул или ссылка WB').fill(String(KNOWN_NM))
	await page.getByRole('button', { name: 'Найти товар' }).click()
	const dialog = page.getByRole('dialog')
	const error = dialog.getByRole('alert')
	await expect(error).toContainText('код 403')

	await context.setOffline(true)
	await error.getByRole('button', { name: 'Повторить' }).click()
	await expect(error).toContainText('Загрузка карточки продолжится после подключения.')
	const waiting = error.getByRole('button', { name: 'Ждём сеть…' })
	await expect(waiting).toBeDisabled()
	await expect(waiting).not.toHaveAttribute('data-loading')

	await context.setOffline(false)
	await expect(dialog.getByRole('heading', { name: cardFixture.imt_name })).toBeVisible()
	await expect(error).toHaveCount(0)
})
