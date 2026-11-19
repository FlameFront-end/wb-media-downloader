import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import type { ProductVideo } from '@/entities/product'
import { HttpError, VIDEO_QUALITIES } from '@/shared/api'
import { InvalidSegmentError, UnsupportedPlaylistError } from '@/shared/lib'

import { server } from '../../../../test/msw/server'

import { downloadProductVideo, VideoUnavailableError } from './download-product-video'

const BASE = 'https://videonme-basket-10.wbbasket.ru/vol114/part60417/604174866/hls'
const video: ProductVideo = {
	sources: VIDEO_QUALITIES.map(quality => ({ quality, playlistUrl: `${BASE}/${quality}/index.m3u8` }))
}
const notFound = () => new HttpResponse(null, { status: 404 })

describe('downloadProductVideo', () => {
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

	it('does not fall back on server errors', async () => {
		server.use(http.get(`${BASE}/1440p/index.m3u8`, () => new HttpResponse(null, { status: 500 })))

		await expect(downloadProductVideo(video)).rejects.toBeInstanceOf(HttpError)
	})

	it('rejects unsupported playlists', async () => {
		server.use(
			http.get(
				`${BASE}/1440p/index.m3u8`,
				() => new HttpResponse('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k"\n#EXTINF:1,\n1.ts\n#EXT-X-ENDLIST')
			)
		)

		await expect(downloadProductVideo(video)).rejects.toBeInstanceOf(UnsupportedPlaylistError)
	})

	it('fails when a segment cannot be downloaded', async () => {
		server.use(http.get(`${BASE}/1440p/1.ts`, () => new HttpResponse(null, { status: 503 })))

		await expect(downloadProductVideo(video)).rejects.toMatchObject({ status: 503 })
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
