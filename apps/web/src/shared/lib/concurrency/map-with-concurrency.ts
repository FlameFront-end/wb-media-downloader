interface MapWithConcurrencyOptions {
	signal?: AbortSignal
}

/**
 * Runs `worker` for every item with at most `limit` calls in flight and
 * returns results in input order.
 *
 * The first failure (or an external abort) aborts the signal passed to the
 * other workers and stops scheduling new ones.
 */
export async function mapWithConcurrency<Item, Result>(
	items: readonly Item[],
	limit: number,
	worker: (item: Item, index: number, signal: AbortSignal) => Promise<Result>,
	{ signal }: MapWithConcurrencyOptions = {}
): Promise<Result[]> {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new RangeError(`limit must be a positive integer, got ${limit}`)
	}

	signal?.throwIfAborted()

	const controller = new AbortController()
	const forwardAbort = () => {
		controller.abort(signal?.reason)
	}
	signal?.addEventListener('abort', forwardAbort, { once: true })

	const results = new Array<Result>(items.length)
	let nextIndex = 0

	const runWorker = async () => {
		while (nextIndex < items.length) {
			controller.signal.throwIfAborted()
			const index = nextIndex++
			results[index] = await worker(items[index] as Item, index, controller.signal)
		}
	}

	try {
		await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker))
	} catch (error) {
		controller.abort(error)
		throw error
	} finally {
		signal?.removeEventListener('abort', forwardAbort)
	}

	return results
}
