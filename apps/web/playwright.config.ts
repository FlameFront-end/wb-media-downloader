import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const isCI = Boolean(process.env.CI)

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	// Production build: chunk names and lazy loading match what users get
	webServer: {
		command: `vite build && vite preview --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !isCI,
		timeout: 120_000
	}
})
