import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: 'jsdom',
			setupFiles: ['./test/setup.ts'],
			include: ['src/**/*.test.{ts,tsx}'],
			restoreMocks: true,
			unstubGlobals: true,
			coverage: {
				provider: 'v8',
				include: ['src/**/*.{ts,tsx}'],
				exclude: ['src/**/*.test.{ts,tsx}', 'src/app/entrypoint/main.tsx'],
				reporter: ['text', 'html', 'lcov', 'json-summary']
			}
		}
	})
)
