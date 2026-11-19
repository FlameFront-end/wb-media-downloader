import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from './msw/server'

/* jsdom gaps required by Mantine */
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string): MediaQueryList => ({
		matches: false,
		media: query,
		onchange: null,
		// Deprecated, but still part of MediaQueryList and used by some libraries
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		addListener: () => undefined,
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		removeListener: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => false
	})
})

class ResizeObserverStub implements ResizeObserver {
	observe() {
		return undefined
	}
	unobserve() {
		return undefined
	}
	disconnect() {
		return undefined
	}
}

window.ResizeObserver = ResizeObserverStub
window.HTMLElement.prototype.scrollIntoView = () => undefined

/* jsdom has no object URLs; tests spy on these (see test/downloads.ts) */
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => undefined

beforeAll(() => {
	server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
	cleanup()
	server.resetHandlers()
})

afterAll(() => {
	server.close()
})
