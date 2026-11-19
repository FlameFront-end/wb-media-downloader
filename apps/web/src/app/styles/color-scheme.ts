/**
 * Color scheme bootstrap for first paint (before the JS bundle and Mantine CSS load).
 * Logic mirrors @mantine/core ColorSchemeScript — keep defaultColorScheme in sync with MantineProvider.
 */

export const DEFAULT_MANTINE_COLOR_SCHEME = 'auto' as const

export const MANTINE_COLOR_SCHEME_STORAGE_KEY = 'mantine-color-scheme-value'

export type MantineColorSchemePreference = 'light' | 'dark' | 'auto'

export type MantineColorScheme = 'light' | 'dark'

const VALID_PREFERENCES: readonly MantineColorSchemePreference[] = ['light', 'dark', 'auto']

/** Default Mantine dark theme tokens from default-css-variables.css */
const MANTINE_DARK_BODY = '#242424'
const MANTINE_DARK_TEXT = '#c9c9c9'

export const MANTINE_COLOR_SCHEME_CRITICAL_CSS = `
html[data-mantine-color-scheme='dark'] {
	color-scheme: dark;
	background-color: ${MANTINE_DARK_BODY};
}
html[data-mantine-color-scheme='light'] {
	color-scheme: light;
	background-color: #fff;
}
html[data-mantine-color-scheme='dark'] body {
	margin: 0;
	background-color: ${MANTINE_DARK_BODY};
	color: ${MANTINE_DARK_TEXT};
}
html[data-mantine-color-scheme='light'] body {
	margin: 0;
	background-color: #fff;
	color: #000;
}
`.trim()

function resolveDefaultPreference(defaultColorScheme: MantineColorSchemePreference): MantineColorSchemePreference {
	return VALID_PREFERENCES.includes(defaultColorScheme) ? defaultColorScheme : 'light'
}

export function resolveStoredColorSchemePreference(
	stored: string | null,
	defaultColorScheme: MantineColorSchemePreference
): MantineColorSchemePreference {
	if (stored === 'light' || stored === 'dark' || stored === 'auto') {
		return stored
	}

	return resolveDefaultPreference(defaultColorScheme)
}

export function resolveMantineColorScheme(
	preference: MantineColorSchemePreference,
	prefersDark: boolean
): MantineColorScheme {
	return preference === 'auto' ? (prefersDark ? 'dark' : 'light') : preference
}

/** Inline script body for index.html — must run synchronously in <head> before first paint. */
export function buildMantineColorSchemeInitScript(
	defaultColorScheme: MantineColorSchemePreference = DEFAULT_MANTINE_COLOR_SCHEME
): string {
	const fallback = resolveDefaultPreference(defaultColorScheme)

	return `try {
  var _colorScheme = window.localStorage.getItem("${MANTINE_COLOR_SCHEME_STORAGE_KEY}");
  var colorScheme = _colorScheme === "light" || _colorScheme === "dark" || _colorScheme === "auto" ? _colorScheme : "${fallback}";
  var computedColorScheme = colorScheme !== "auto" ? colorScheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-mantine-color-scheme", computedColorScheme);
} catch (e) {}`
}
