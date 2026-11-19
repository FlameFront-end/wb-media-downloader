import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES_DIR = join(import.meta.dirname, '../../fixtures/photos')
const originals = [1, 2, 3].map(index => readFileSync(join(FIXTURES_DIR, `${index}.webp`)))

/** Distinct, decodable WebPs for the selected-file tests. */
export function photoBytes(index: number): Uint8Array<ArrayBuffer> {
	const original = originals[(index - 1) % originals.length]

	if (!original) {
		throw new RangeError(`No photo fixture for index ${index}`)
	}
	return new Uint8Array(original)
}
