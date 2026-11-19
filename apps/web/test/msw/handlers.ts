import type { RequestHandler } from 'msw'

/**
 * Default request handlers shared by all tests.
 * Override per test with `server.use(...)`.
 */
export const handlers: RequestHandler[] = []
