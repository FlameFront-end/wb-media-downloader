import { describe, expect, it } from 'vitest'

import {
	buildMantineColorSchemeInitScript,
	DEFAULT_MANTINE_COLOR_SCHEME,
	MANTINE_COLOR_SCHEME_STORAGE_KEY,
	resolveMantineColorScheme,
	resolveStoredColorSchemePreference
} from './color-scheme'

describe('resolveStoredColorSchemePreference', () => {
	it('uses stored dark preference', () => {
		expect(resolveStoredColorSchemePreference('dark', DEFAULT_MANTINE_COLOR_SCHEME)).toBe('dark')
	})

	it('falls back to default when storage is missing', () => {
		expect(resolveStoredColorSchemePreference(null, DEFAULT_MANTINE_COLOR_SCHEME)).toBe('auto')
	})
})

describe('resolveMantineColorScheme', () => {
	it('resolves auto from prefers-color-scheme: dark', () => {
		expect(resolveMantineColorScheme('auto', true)).toBe('dark')
	})

	it('falls back to light when auto and system is light', () => {
		expect(resolveMantineColorScheme('auto', false)).toBe('light')
	})
})

describe('buildMantineColorSchemeInitScript', () => {
	it('embeds storage key and default fallback for index.html', () => {
		const script = buildMantineColorSchemeInitScript(DEFAULT_MANTINE_COLOR_SCHEME)

		expect(script).toContain(MANTINE_COLOR_SCHEME_STORAGE_KEY)
		expect(script).toContain('data-mantine-color-scheme')
		expect(script).toContain('"auto"')
	})
})
