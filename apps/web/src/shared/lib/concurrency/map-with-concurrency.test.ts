import { describe, expect, it } from 'vitest'

import { mapWithConcurrency } from './map-with-concurrency'

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

describe('mapWithConcurrency', () => {
	it('returns results in input order', async () => {
		const result = await mapWithConcurrency([30, 10, 20], 2, async ms => {
			await new Promise(resolve => setTimeout(resolve, ms))
			return ms * 2
		})

		expect(result).toEqual([60, 20, 40])
	})

	it('never runs more than `limit` workers at once', async () => {
		let active = 0
		let peak = 0

		await mapWithConcurrency(
			Array.from({ length: 10 }, (_, i) => i),
			3,
			async () => {
				active++
				peak = Math.max(peak, active)
				await tick()
				active--
			}
		)

		expect(peak).toBe(3)
	})

	it('handles empty input', async () => {
		await expect(mapWithConcurrency([], 4, () => Promise.resolve(1))).resolves.toEqual([])
	})

	it('rejects with the first error, aborts running workers and stops scheduling', async () => {
		const started: number[] = []
		const abortedWorkers: number[] = []

		const run = mapWithConcurrency([0, 1, 2, 3, 4], 2, async (item, _, signal) => {
			started.push(item)
			signal.addEventListener('abort', () => abortedWorkers.push(item))

			if (item === 0) {
				throw new Error('boom')
			}

			await tick()
		})

		await expect(run).rejects.toThrow('boom')
		expect(started).toEqual([0, 1])
		expect(abortedWorkers).toEqual([0, 1])
	})

	it('stops on external abort and forwards the reason', async () => {
		const controller = new AbortController()
		const reason = new Error('cancelled')
		const started: number[] = []

		const run = mapWithConcurrency(
			[0, 1, 2, 3],
			1,
			async (item, _, signal) => {
				started.push(item)
				await tick()
				signal.throwIfAborted()
			},
			{ signal: controller.signal }
		)
		controller.abort(reason)

		await expect(run).rejects.toBe(reason)
		expect(started).toEqual([0])
	})

	it('rejects immediately when already aborted', async () => {
		const controller = new AbortController()
		controller.abort()

		await expect(
			mapWithConcurrency([1], 1, () => Promise.resolve(1), { signal: controller.signal })
		).rejects.toMatchObject({ name: 'AbortError' })
	})

	it.each([0, -1, 1.5])('rejects invalid limit %s', async limit => {
		await expect(mapWithConcurrency([1], limit, () => Promise.resolve(1))).rejects.toThrow(RangeError)
	})
})
