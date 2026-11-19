import { describe, expect, it } from 'vitest'

import { blobBytes } from '../../../../../test/downloads'
import { PLAYLIST_DURATION_SECONDS, segmentFixtures } from '../../../../../test/msw/fixtures/hls'

import { InvalidSegmentError, UnsupportedPlaylistError } from './errors'
import { createMp4Transmuxer } from './mp4-transmuxer'

interface Box {
	type: string
	offset: number
	size: number
}

function topLevelBoxes(bytes: Uint8Array): Box[] {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	const boxes: Box[] = []

	for (let offset = 0; offset + 8 <= bytes.byteLength;) {
		const size = view.getUint32(offset)
		boxes.push({ type: new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8)), offset, size })
		offset += size
	}

	return boxes
}

function findBox(bytes: Uint8Array, type: string): number {
	return new TextDecoder('latin1').decode(bytes).indexOf(type) - 4
}

describe('createMp4Transmuxer', () => {
	it('remuxes MPEG-TS segments into a fragmented MP4 with real duration', async () => {
		const transmuxer = await createMp4Transmuxer()

		transmuxer.push(segmentFixtures['0'] as Uint8Array)
		transmuxer.push(segmentFixtures['1'] as Uint8Array)
		const file = transmuxer.finish(PLAYLIST_DURATION_SECONDS)
		const bytes = await blobBytes(file)
		const types = topLevelBoxes(bytes).map(box => box.type)

		expect(file.type).toBe('video/mp4')
		expect(types.slice(0, 2)).toEqual(['ftyp', 'moov'])
		const fragments = types.filter(type => type === 'moof').length
		expect(fragments).toBeGreaterThanOrEqual(2)
		expect(types.filter(type => type === 'mdat')).toHaveLength(fragments)

		const view = new DataView(bytes.buffer)
		const mvhd = findBox(bytes, 'mvhd')
		const timescale = view.getUint32(mvhd + 20)
		const duration = view.getUint32(mvhd + 24)

		expect(duration / timescale).toBeCloseTo(PLAYLIST_DURATION_SECONDS, 3)
	})

	/** MPEG-TS null packets: valid transport stream, no media. */
	const nullPackets = (count: number) => {
		const bytes = new Uint8Array(188 * count)

		for (let packet = 0; packet < count; packet++) {
			bytes.set([0x47, 0x1f, 0xff, 0x10], packet * 188)
		}

		return bytes
	}

	it.each([
		['empty segment', new Uint8Array(0)],
		['html error page', new TextEncoder().encode('<html>'.padEnd(400, ' '))],
		['transport stream without media', nullPackets(10)]
	])('rejects %s', async (_, segment) => {
		const transmuxer = await createMp4Transmuxer()

		expect(() => {
			transmuxer.push(segment)
		}).toThrow(InvalidSegmentError)
	})

	it('rejects a broken segment after valid ones', async () => {
		const transmuxer = await createMp4Transmuxer()

		transmuxer.push(segmentFixtures['0'] as Uint8Array)

		expect(() => {
			transmuxer.push(new Uint8Array(0))
		}).toThrow(InvalidSegmentError)
	})

	it('refuses to finish without any media', async () => {
		const transmuxer = await createMp4Transmuxer()

		expect(() => transmuxer.finish(1)).toThrow(UnsupportedPlaylistError)
	})
})
