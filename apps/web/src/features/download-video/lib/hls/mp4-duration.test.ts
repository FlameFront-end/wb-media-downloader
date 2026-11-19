import { describe, expect, it } from 'vitest'

import { setMp4Duration } from './mp4-duration'

function box(type: string, payload: number[]): number[] {
	const size = 8 + payload.length
	return [
		size >>> 24,
		(size >>> 16) & 0xff,
		(size >>> 8) & 0xff,
		size & 0xff,
		...Array.from({ length: 4 }, (_, i) => type.charCodeAt(i)),
		...payload
	]
}

const u32 = (value: number) => [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
const u64 = (value: number) => [...u32(Math.floor(value / 2 ** 32)), ...u32(value >>> 0)]
const UNKNOWN = 0xffffffff

function initSegment(version: 0 | 1): Uint8Array<ArrayBuffer> {
	const time = version === 1 ? u64 : u32
	const unknown = version === 1 ? u64(UNKNOWN) : u32(UNKNOWN)
	const header = [version, 0, 0, 0]
	const mvhd = box('mvhd', [...header, ...time(1), ...time(2), ...u32(90_000), ...unknown])
	const tkhd = box('tkhd', [...header, ...time(1), ...time(2), ...u32(1), ...u32(0), ...unknown])
	const mdhd = box('mdhd', [...header, ...time(1), ...time(2), ...u32(22_050), ...unknown])
	const moov = box('moov', [...mvhd, ...box('trak', [...tkhd, ...box('mdia', mdhd)])])

	return new Uint8Array([...box('ftyp', [0x69, 0x73, 0x6f, 0x6d]), ...moov])
}

function readDurations(bytes: Uint8Array, version: 0 | 1) {
	const view = new DataView(bytes.buffer)
	const text = new TextDecoder('latin1').decode(bytes)
	const timeSize = version === 1 ? 8 : 4
	const read = (offset: number) => (version === 1 ? Number(view.getBigUint64(offset)) : view.getUint32(offset))
	const at = (type: string) => text.indexOf(type) - 4

	return {
		mvhd: read(at('mvhd') + 12 + timeSize * 2 + 4),
		tkhd: read(at('tkhd') + 12 + timeSize * 2 + 8),
		mdhd: read(at('mdhd') + 12 + timeSize * 2 + 4)
	}
}

describe('setMp4Duration', () => {
	it.each([0, 1] as const)('writes movie and track durations (box version %i)', version => {
		const source = initSegment(version)
		const patched = setMp4Duration(source, 11.432)

		expect(readDurations(patched, version)).toEqual({
			mvhd: Math.round(11.432 * 90_000),
			tkhd: Math.round(11.432 * 90_000),
			mdhd: Math.round(11.432 * 22_050)
		})
		expect(readDurations(source, version).mvhd).toBe(UNKNOWN)
	})

	it('returns an unchanged copy when there is no movie header', () => {
		const source = new Uint8Array(box('ftyp', [1, 2, 3, 4]))

		expect(setMp4Duration(source, 1)).toEqual(source)
	})
})
