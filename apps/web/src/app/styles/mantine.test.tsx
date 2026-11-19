import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { HomePage } from '@/pages/home'
import { ErrorFallback } from '@/shared/ui'

import { KNOWN_NM, MISSING_NM } from '../../../test/msw/fixtures/wb'
import { server } from '../../../test/msw/server'
import { renderWithProviders } from '../../../test/render'

const require = createRequire(join(import.meta.dirname, 'mantine.ts'))
const stylesSource = readFileSync(join(import.meta.dirname, 'mantine.ts'), 'utf8')
const importedStyles = [...stylesSource.matchAll(/import '(@mantine\/core\/styles\/[\w-]+\.css)'/g)].flatMap(
	([, path]) => (path ? [path] : [])
)
const css = importedStyles.map(path => readFileSync(require.resolve(path), 'utf8')).join('\n')

/** Mantine component classes look like `m_8bffd616`. */
function renderedMantineClasses(): string[] {
	const classes = new Set<string>()

	document.querySelectorAll('[class]').forEach(element => {
		element.classList.forEach(name => {
			if (/^m_[0-9a-f]+$/.test(name)) {
				classes.add(name)
			}
		})
	})

	return [...classes]
}

function expectStylesFor(classes: string[]) {
	expect(classes.length).toBeGreaterThan(0)
	expect(classes.filter(name => !css.includes(`.${name}`))).toEqual([])
}

async function openModal(article: number) {
	const user = userEvent.setup()
	renderWithProviders(<HomePage />)
	await user.type(screen.getByLabelText('Артикул'), String(article))
	await user.click(screen.getByRole('button', { name: 'Скачать фото' }))

	return user
}

describe('selective Mantine styles', () => {
	it('imports only existing stylesheets', () => {
		expect(importedStyles.length).toBeGreaterThan(3)
	})

	it('cover the form with a validation error', async () => {
		const user = userEvent.setup()
		renderWithProviders(<HomePage />)
		await user.click(screen.getByRole('button', { name: 'Скачать фото' }))

		expectStylesFor(renderedMantineClasses())
	})

	it('cover the modal while loading', async () => {
		server.use(http.get(/card\.json$/, () => new Promise<never>(() => undefined)))
		await openModal(KNOWN_NM)
		await screen.findByLabelText('Загрузка карточки')

		expectStylesFor(renderedMantineClasses())
	})

	it('cover the gallery and download progress', async () => {
		server.use(http.get(/\/images\/big\//, () => new Promise<never>(() => undefined)))
		const user = await openModal(KNOWN_NM)
		await user.click(await screen.findByRole('button', { name: 'Скачать фото (3)' }))
		await screen.findByText('Загружено 0 из 3')

		expectStylesFor(renderedMantineClasses())
	})

	it('cover not found and error alerts', async () => {
		await openModal(MISSING_NM)
		await screen.findByText('Товар не найден')

		expectStylesFor(renderedMantineClasses())
	})

	it('cover the error fallback', () => {
		renderWithProviders(<ErrorFallback error={new Error('x')} resetErrorBoundary={() => undefined} />)

		expectStylesFor(renderedMantineClasses())
	})
})
