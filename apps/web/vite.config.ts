import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [
		react(),
		// `npm run analyze` → dist/stats.html with chunk composition and gzip sizes
		mode === 'analyze' && visualizer({ filename: 'dist/stats.html', template: 'treemap', gzipSize: true })
	],
	resolve: {
		tsconfigPaths: true
	}
}))
