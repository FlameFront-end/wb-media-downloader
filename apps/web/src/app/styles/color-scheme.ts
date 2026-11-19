/**
 * Color scheme bootstrap for first paint (before the JS bundle and Mantine CSS load).
 * Logic mirrors @mantine/core ColorSchemeScript — keep defaultColorScheme in sync with MantineProvider.
 */

export const DEFAULT_MANTINE_COLOR_SCHEME = 'auto' as const

export const MANTINE_COLOR_SCHEME_STORAGE_KEY = 'mantine-color-scheme-value'

type MantineColorSchemePreference = 'light' | 'dark' | 'auto'

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

/** Inline script body for index.html — must run synchronously in <head> before first paint. */
export function buildMantineColorSchemeInitScript(
	defaultColorScheme: MantineColorSchemePreference = DEFAULT_MANTINE_COLOR_SCHEME
): string {
	return `(function () {
var wbColorScheme = ${JSON.stringify(defaultColorScheme)};
try {
  var stored = window.localStorage.getItem("${MANTINE_COLOR_SCHEME_STORAGE_KEY}");
  if (stored === "light" || stored === "dark" || stored === "auto") {
    wbColorScheme = stored;
  }
} catch {}
if (wbColorScheme === "auto") {
  wbColorScheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
document.documentElement.setAttribute("data-mantine-color-scheme", wbColorScheme);
})();`
}
