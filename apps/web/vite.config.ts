import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

import { injectMantineColorSchemeHtml } from './vite/inject-mantine-color-scheme-html.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [
		injectMantineColorSchemeHtml(),
		react(),
		// `npm run analyze` → dist/stats.html with chunk composition and gzip sizes
		mode === 'analyze' && visualizer({ filename: 'dist/stats.html', template: 'treemap', gzipSize: true })
	],
	resolve: {
		tsconfigPaths: true
	}
}))
