import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePhotoSelection } from './use-photo-selection'

function renderSelection(initial: readonly number[]) {
	return renderHook(({ indexes }) => usePhotoSelection(indexes), { initialProps: { indexes: initial } })
}

describe('usePhotoSelection', () => {
	it('selects everything by default', () => {
		const { result } = renderSelection([1, 2, 3])

		expect(result.current.selectedIndexes).toEqual([1, 2, 3])
		expect(result.current.allSelected).toBe(true)
		expect(result.current.someSelected).toBe(false)
	})

	it('toggles a single photo', () => {
		const { result } = renderSelection([1, 2, 3])

		act(() => {
			result.current.toggle(2)
		})

		expect(result.current.isSelected(2)).toBe(false)
		expect(result.current.selectedIndexes).toEqual([1, 3])
		expect(result.current.someSelected).toBe(true)

		act(() => {
			result.current.toggle(2)
		})

		expect(result.current.allSelected).toBe(true)
	})

	it('toggleAll clears full selection and selects all from partial', () => {
		const { result } = renderSelection([1, 2, 3])

		act(() => {
			result.current.toggleAll()
		})
		expect(result.current.selectedCount).toBe(0)

		act(() => {
			result.current.toggle(1)
		})
		act(() => {
			result.current.toggleAll()
		})
		expect(result.current.allSelected).toBe(true)
	})

	it('keeps toggle stable between renders', () => {
		const { result, rerender } = renderSelection([1, 2, 3])
		const { toggle } = result.current

		act(() => {
			result.current.toggle(1)
		})
		rerender({ indexes: [1, 2, 3] })

		expect(result.current.toggle).toBe(toggle)
	})

	it('is never "all selected" without photos', () => {
		const { result } = renderSelection([])

		expect(result.current.allSelected).toBe(false)
		expect(result.current.selectedCount).toBe(0)
	})

	describe('when the photo list changes', () => {
		it('drops removed photos from a full selection', () => {
			const { result, rerender } = renderSelection([1, 2, 3])

			rerender({ indexes: [1, 2] })

			expect(result.current.selectedIndexes).toEqual([1, 2])
			expect(result.current.selectedCount).toBe(2)
			expect(result.current.allSelected).toBe(true)
		})

		it('keeps state of remaining photos', () => {
			const { result, rerender } = renderSelection([1, 2, 3])

			act(() => {
				result.current.toggle(1)
			})
			rerender({ indexes: [1, 2] })

			expect(result.current.isSelected(1)).toBe(false)
			expect(result.current.selectedIndexes).toEqual([2])
			expect(result.current.someSelected).toBe(true)
		})

		it('does not count a deselected photo that disappeared', () => {
			const { result, rerender } = renderSelection([1, 2, 3])

			act(() => {
				result.current.toggle(3)
			})
			rerender({ indexes: [1, 2] })

			expect(result.current.selectedIndexes).toEqual([1, 2])
			expect(result.current.allSelected).toBe(true)
		})

		it('selects newly added photos', () => {
			const { result, rerender } = renderSelection([1, 2])

			act(() => {
				result.current.toggle(2)
			})
			rerender({ indexes: [1, 2, 3] })

			expect(result.current.selectedIndexes).toEqual([1, 3])
		})

		it('selects a photo that disappeared and came back', () => {
			const { result, rerender } = renderSelection([1, 2, 3])

			act(() => {
				result.current.toggle(3)
			})
			rerender({ indexes: [1, 2] })
			rerender({ indexes: [1, 2, 3] })

			expect(result.current.isSelected(3)).toBe(true)
			expect(result.current.allSelected).toBe(true)
		})

		it('keeps state when the list is recreated with the same photos', () => {
			const { result, rerender } = renderSelection([1, 2, 3])

			act(() => {
				result.current.toggle(2)
			})
			rerender({ indexes: [1, 2, 3] })

			expect(result.current.selectedIndexes).toEqual([1, 3])
		})

		it('toggleAll works on the updated list', () => {
			const { result, rerender } = renderSelection([1, 2, 3])

			rerender({ indexes: [1, 2] })
			act(() => {
				result.current.toggleAll()
			})

			expect(result.current.selectedCount).toBe(0)

			act(() => {
				result.current.toggleAll()
			})

			expect(result.current.selectedIndexes).toEqual([1, 2])
		})
	})
})
