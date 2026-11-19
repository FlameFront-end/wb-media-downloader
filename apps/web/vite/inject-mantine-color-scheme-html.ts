import type { Plugin } from 'vite'

import {
	buildMantineColorSchemeInitScript,
	DEFAULT_MANTINE_COLOR_SCHEME,
	MANTINE_COLOR_SCHEME_CRITICAL_CSS
} from '../src/app/styles/color-scheme.ts'

export function injectMantineColorSchemeHtml(): Plugin {
	return {
		name: 'inject-mantine-color-scheme-html',
		transformIndexHtml: {
			order: 'pre',
			handler(html) {
				const initScript = buildMantineColorSchemeInitScript(DEFAULT_MANTINE_COLOR_SCHEME)
				const injection = [
					'<meta name="color-scheme" content="light dark" />',
					`<style id="mantine-color-scheme-critical">${MANTINE_COLOR_SCHEME_CRITICAL_CSS}</style>`,
					`<script data-mantine-script>${initScript}</script>`
				].join('\n\t\t')

				return html.replace('<head>', `<head>\n\t\t${injection}`)
			}
		}
	}
}
