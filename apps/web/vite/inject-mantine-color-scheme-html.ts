import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { transformWithOxc, type Plugin } from 'vite'

import { DEFAULT_MANTINE_COLOR_SCHEME } from '../src/app/styles/color-scheme/color-scheme.ts'

const stylesPath = new URL('../src/app/styles/color-scheme/color-scheme-critical.css', import.meta.url)
const scriptPath = fileURLToPath(new URL('../src/app/styles/color-scheme/color-scheme-init.ts', import.meta.url))

export function injectMantineColorSchemeHtml(): Plugin {
	return {
		name: 'inject-mantine-color-scheme-html',
		transformIndexHtml: {
			order: 'pre',
			async handler() {
				const [css, script] = await Promise.all([readFile(stylesPath, 'utf8'), readFile(scriptPath, 'utf8')])
				const { code } = await transformWithOxc(script, scriptPath)

				return [
					{ tag: 'style', children: css, injectTo: 'head' },
					{
						tag: 'script',
						attrs: {
							'data-mantine-script': true,
							'data-default-color-scheme': DEFAULT_MANTINE_COLOR_SCHEME
						},
						children: code,
						injectTo: 'head'
					}
				]
			}
		}
	}
}
