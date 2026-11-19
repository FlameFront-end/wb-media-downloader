import { unzipSync } from 'fflate'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { InvalidResponseError } from '@/shared/api'

import { blobBytes } from '../../../../test/downloads'
import { photoBytes } from '../../../../test/msw/fixtures/photos'
import { server } from '../../../../test/msw/server'

import { createPhotosZip, PhotoDownloadError } from './create-photos-zip'

const NM = 604174866
const photoUrl = (index: number) => `https://basket-30.wbbasket.ru/vol6041/part604174/${NM}/images/big/${index}.webp`
const entries = [1, 2, 3].map(index => ({ url: photoUrl(index), filename: `${index}.webp` }))

async function unzip(blob: Blob) {
	return unzipSync(await blobBytes(blob))
}

describe('createPhotosZip', () => {
	it('puts every photo into the archive under its name', async () => {
		const zip = await createPhotosZip(entries)
		const files = await unzip(zip)

		expect(zip.type).toBe('application/zip')
		expect(Object.keys(files).sort()).toEqual(['1.webp', '2.webp', '3.webp'])
		expect(files['2.webp']).toEqual(photoBytes(2))
	})

	it('reports progress from 0 to total', async () => {
		const progress: string[] = []

		await createPhotosZip(entries, {
			onProgress: (done, total) => progress.push(`${done}/${total}`)
		})

		expect(progress).toEqual(['0/3', '1/3', '2/3', '3/3'])
	})

	it('limits parallel downloads', async () => {
		let active = 0
		let peak = 0
		server.use(
			http.get(/\/images\/big\/\d+\.webp$/, async () => {
				active++
				peak = Math.max(peak, active)
				await new Promise(resolve => setTimeout(resolve, 5))
				active--
				return HttpResponse.arrayBuffer(photoBytes(1).buffer)
			})
		)
		const many = Array.from({ length: 10 }, (_, i) => ({ url: photoUrl(i + 1), filename: `${i}.webp` }))

		await createPhotosZip(many, { concurrency: 3 })

		expect(peak).toBe(3)
	})

	it('retries a transient failure', async () => {
		let attempts = 0
		server.use(
			http.get(photoUrl(2), () => {
				attempts++
				return attempts === 1
					? new HttpResponse(null, { status: 503 })
					: HttpResponse.arrayBuffer(photoBytes(2).buffer)
			})
		)

		const files = await unzip(await createPhotosZip(entries))

		expect(attempts).toBe(2)
		expect(files['2.webp']).toEqual(photoBytes(2))
	})

	it('fails with the name of the photo that could not be downloaded', async () => {
		server.use(http.get(photoUrl(3), () => new HttpResponse(null, { status: 404 })))

		const error = await createPhotosZip(entries).catch((e: unknown) => e)

		expect(error).toBeInstanceOf(PhotoDownloadError)
		expect(error).toMatchObject({ filename: '3.webp' })
	})

	it.each([
		['HTML', () => HttpResponse.html('<html>CDN temporarily unavailable</html>')],
		['empty body', () => new HttpResponse(null, { status: 200 })],
		['truncated WebP', () => HttpResponse.arrayBuffer(photoBytes(1).slice(0, -1).buffer)]
	])('rejects %s instead of storing it as a photo', async (_, respond) => {
		let attempts = 0
		server.use(
			http.get(photoUrl(1), () => {
				attempts++
				return respond()
			})
		)

		const error = await createPhotosZip(entries).catch((cause: unknown) => cause)
		expect(error).toMatchObject({ filename: '1.webp' })
		expect(error instanceof PhotoDownloadError && error.cause instanceof InvalidResponseError).toBe(true)
		expect(attempts).toBe(1)
	})

	it('does not retry client errors', async () => {
		let attempts = 0
		server.use(
			http.get(photoUrl(1), () => {
				attempts++
				return new HttpResponse(null, { status: 404 })
			})
		)

		await expect(createPhotosZip(entries)).rejects.toBeInstanceOf(PhotoDownloadError)
		expect(attempts).toBe(1)
	})

	it('does not request anything when already aborted', async () => {
		let requests = 0
		server.use(
			http.get(/\/images\/big\/\d+\.webp$/, () => {
				requests++
				return undefined
			})
		)
		const controller = new AbortController()
		controller.abort()

		await expect(createPhotosZip(entries, { signal: controller.signal })).rejects.toMatchObject({
			name: 'AbortError'
		})
		expect(requests).toBe(0)
	})

	it('aborts without wrapping the abort into a download error', async () => {
		const controller = new AbortController()
		server.use(
			http.get(/\/images\/big\/\d+\.webp$/, async () => {
				controller.abort()
				await new Promise(resolve => setTimeout(resolve, 5))
				return HttpResponse.arrayBuffer(photoBytes(1).buffer)
			})
		)

		await expect(createPhotosZip(entries, { signal: controller.signal })).rejects.toMatchObject({
			name: 'AbortError'
		})
	})
})
