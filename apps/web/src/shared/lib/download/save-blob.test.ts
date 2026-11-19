import { afterEach, describe, expect, it, vi } from 'vitest'

import { captureDownloads } from '../../../../test/downloads'

import { saveBlob } from './save-blob'

describe('saveBlob', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('downloads blob under given name and revokes the url later', () => {
		vi.useFakeTimers()
		const downloads = captureDownloads()
		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
		const blob = new Blob(['x'])

		saveBlob(blob, 'file.zip')

		expect(downloads).toEqual([{ filename: 'file.zip', blob }])
		expect(document.querySelector('a')).toBeNull()
		expect(revokeObjectURL).not.toHaveBeenCalled()

		vi.runAllTimers()

		expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1')
	})
})
