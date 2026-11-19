import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProductVideo } from '@/entities/product'
import { HttpError, ResponseTooLargeError, VIDEO_QUALITIES } from '@/shared/api'
import type * as sharedLib from '@/shared/lib'
import { InvalidSegmentError, UnsupportedPlaylistError } from '@/shared/lib'

import { segmentFixtures } from '../../../../test/msw/fixtures/hls'
import { server } from '../../../../test/msw/server'

import { downloadProductVideo, VideoUnavailableError } from './download-product-video'

const BASE = 'https://videonme-basket-10.wbbasket.ru/vol114/part60417/604174866/hls'
const video: ProductVideo = {
	sources: VIDEO_QUALITIES.map(quality => ({ quality, playlistUrl: `${BASE}/${quality}/index.m3u8` }))
}
const notFound = () => new HttpResponse(null, { status: 404 })

const transmuxers = vi.hoisted(() => ({ created: 0, disposed: 0 }))

vi.mock('@/shared/lib', async importOriginal => {
	const lib = await importOriginal<typeof sharedLib>()

	return {
		...lib,
		createMp4Transmuxer: async () => {
			// Counted on call, before the async import: a transmuxer started in parallel
			// with a failing playlist request is caught however fast the request fails
			transmuxers.created++
			const transmuxer = await lib.createMp4Transmuxer()

			return {
				...transmuxer,
				dispose: () => {
					transmuxers.disposed++
					transmuxer.dispose()
				}
			}
		}
	}
})

describe('downloadProductVideo', () => {
	beforeEach(() => {
		transmuxers.created = 0
		transmuxers.disposed = 0
	})

	it('downloads the best quality as mp4', async () => {
		const progress: string[] = []

		const result = await downloadProductVideo(video, {
			onProgress: (done, total) => progress.push(`${done}/${total}`)
		})

		expect(result.quality).toBe('1440p')
		expect(result.file.type).toBe('video/mp4')
		expect(result.file.size).toBeGreaterThan(0)
		expect(progress).toEqual(['0/2', '1/2', '2/2'])
	})

	it('falls back to the next quality when a playlist is missing', async () => {
		const requested: string[] = []
		server.use(
			http.get(`${BASE}/1440p/index.m3u8`, notFound),
			http.get(/\/hls\/\w+\/\d+\.ts$/, ({ request }) => {
				requested.push(new URL(request.url).pathname.split('/').at(-2) ?? '')
				return undefined
			})
		)

		const result = await downloadProductVideo(video)

		expect(result.quality).toBe('1080p')
		expect(new Set(requested)).toEqual(new Set(['1080p']))
	})

	it('fails when no quality is available', async () => {
		server.use(http.get(/\/hls\/\w+\/index\.m3u8$/, notFound))

		await expect(downloadProductVideo(video)).rejects.toBeInstanceOf(VideoUnavailableError)
	})

	it('tries the next quality when a segment is missing and disposes the abandoned muxer', async () => {
		server.use(http.get(`${BASE}/1440p/1.ts`, notFound))

		await expect(downloadProductVideo(video)).resolves.toMatchObject({ quality: '1080p' })
		expect(transmuxers).toEqual({ created: 2, disposed: 2 })
	})

	it('tries the next quality without muxing a discontinuous rendition', async () => {
		server.use(
			http.get(`${BASE}/1440p/index.m3u8`, () =>
				HttpResponse.text('#EXTM3U\n#EXTINF:1,\n0.ts\n#EXT-X-DISCONTINUITY\n#EXTINF:1,\n1.ts\n#EXT-X-ENDLIST')
			)
		)

		await expect(downloadProductVideo(video)).resolves.toMatchObject({ quality: '1080p' })
		expect(transmuxers).toEqual({ created: 1, disposed: 1 })
	})

	it('disposes the muxer and falls back when 1440p exceeds the byte budget', async () => {
		const [first, second] = [segmentFixtures['0'], segmentFixtures['1']]
		if (!first || !second) {
			throw new Error('Missing TS fixture')
		}
		server.use(
			http.get(`${BASE}/1440p/1.ts`, () => HttpResponse.arrayBuffer(new Uint8Array(second.byteLength + 1).buffer))
		)

		await expect(
			downloadProductVideo(video, { maxTotalBytes: first.byteLength + second.byteLength })
		).resolves.toMatchObject({
			quality: '1080p'
		})
		expect(transmuxers).toEqual({ created: 2, disposed: 2 })
	})

	it('reports the limit if all renditions exceed the budget', async () => {
		await expect(downloadProductVideo(video, { maxTotalBytes: 8 })).rejects.toBeInstanceOf(ResponseTooLargeError)
		expect(transmuxers).toEqual({ created: 3, disposed: 3 })
	})

	it('does not fall back on server errors', async () => {
		server.use(http.get(`${BASE}/1440p/index.m3u8`, () => new HttpResponse(null, { status: 500 })))

		await expect(downloadProductVideo(video)).rejects.toBeInstanceOf(HttpError)
	})

	it('rejects unsupported playlists when every rendition is incompatible', async () => {
		server.use(
			http.get(
				/\/hls\/\w+\/index\.m3u8$/,
				() => new HttpResponse('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k"\n#EXTINF:1,\n1.ts\n#EXT-X-ENDLIST')
			)
		)

		await expect(downloadProductVideo(video)).rejects.toBeInstanceOf(UnsupportedPlaylistError)
	})

	it('fails when a segment cannot be downloaded', async () => {
		let attempts = 0
		server.use(
			http.get(`${BASE}/1440p/1.ts`, () => {
				attempts++
				return new HttpResponse(null, { status: 503 })
			})
		)

		await expect(downloadProductVideo(video)).rejects.toMatchObject({ status: 503 })
		expect(attempts).toBe(2)
	})

	it('releases the transmuxer whether the download succeeds or fails', async () => {
		await downloadProductVideo(video)
		server.use(http.get(`${BASE}/1440p/1.ts`, () => new HttpResponse(null, { status: 503 })))
		await expect(downloadProductVideo(video)).rejects.toThrow()

		expect(transmuxers).toEqual({ created: 2, disposed: 2 })
	})

	it('does not create a transmuxer when no playlist is available', async () => {
		server.use(http.get(/\/hls\/\w+\/index\.m3u8$/, notFound))

		await expect(downloadProductVideo(video)).rejects.toBeInstanceOf(VideoUnavailableError)
		expect(transmuxers).toEqual({ created: 0, disposed: 0 })
	})

	it('does not create a transmuxer when the playlist is unsupported', async () => {
		server.use(http.get(/\/hls\/\w+\/index\.m3u8$/, () => HttpResponse.text('not a playlist')))

		await expect(downloadProductVideo(video)).rejects.toBeInstanceOf(UnsupportedPlaylistError)
		expect(transmuxers).toEqual({ created: 0, disposed: 0 })
	})

	it.each([
		['empty last segment', () => new HttpResponse(new Uint8Array(0), { status: 200 })],
		['html instead of last segment', () => new HttpResponse('<html>'.padEnd(400, ' '), { status: 200 })]
	])('rejects %s instead of saving a truncated file', async (_, resolver) => {
		server.use(http.get(`${BASE}/1440p/1.ts`, resolver))

		await expect(downloadProductVideo(video)).rejects.toBeInstanceOf(InvalidSegmentError)
	})

	it('does not request anything when already aborted', async () => {
		let requests = 0
		server.use(
			http.get(/\/hls\//, () => {
				requests++
				return undefined
			})
		)
		const controller = new AbortController()
		controller.abort()

		await expect(downloadProductVideo(video, { signal: controller.signal })).rejects.toMatchObject({
			name: 'AbortError'
		})
		expect(requests).toBe(0)
	})

	it('stops on abort', async () => {
		const controller = new AbortController()
		server.use(
			http.get(`${BASE}/1440p/0.ts`, () => {
				controller.abort()
				return undefined
			})
		)

		await expect(downloadProductVideo(video, { signal: controller.signal })).rejects.toMatchObject({
			name: 'AbortError'
		})
	})
})
