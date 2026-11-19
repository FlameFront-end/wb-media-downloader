import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES_DIR = join(import.meta.dirname, '../../fixtures/hls')
const read = (name: string) => readFileSync(join(FIXTURES_DIR, name))

export const playlistFixture = read('index.m3u8').toString('utf8')
export const segmentFixtures: Record<string, Uint8Array<ArrayBuffer>> = {
	'0': new Uint8Array(read('0.mpegts')),
	'1': new Uint8Array(read('1.mpegts'))
}
export const PLAYLIST_DURATION_SECONDS = 2

/** Body of a mocked photo: lets tests check which original ended up in the archive. */
export function photoBytes(nm: number, index: number): Uint8Array<ArrayBuffer> {
	return new TextEncoder().encode(`photo:${nm}:${index}`)
}
