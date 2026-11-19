import { useCallback, useMemo, useState } from 'react'

export interface PhotoSelection {
	/** Selected indexes in gallery order */
	selectedIndexes: readonly number[]
	selectedCount: number
	allSelected: boolean
	someSelected: boolean
	isSelected: (index: number) => boolean
	toggle: (index: number) => void
	toggleAll: () => void
}

interface SelectionState {
	indexes: readonly number[]
	deselected: ReadonlySet<number>
}

function pruneDeselected(deselected: ReadonlySet<number>, indexes: readonly number[]): ReadonlySet<number> {
	const present = new Set(indexes)

	return new Set([...deselected].filter(index => present.has(index)))
}

/**
 * Photo selection, everything selected by default.
 *
 * Stores the photos the user *deselected*. When the photo list changes,
 * remaining photos keep their state, removed ones are forgotten (so a photo
 * that comes back later is treated as new) and new ones come in selected.
 * Reset it for another product by remounting (`key={product.id}`).
 */
export function usePhotoSelection(indexes: readonly number[]): PhotoSelection {
	const [state, setState] = useState<SelectionState>(() => ({ indexes, deselected: new Set() }))

	// Adjust state while rendering when the list changes, so no frame shows a stale
	// selection: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
	let { deselected } = state

	if (state.indexes !== indexes) {
		deselected = pruneDeselected(state.deselected, indexes)
		setState({ indexes, deselected })
	}

	const selectedIndexes = useMemo(() => indexes.filter(index => !deselected.has(index)), [indexes, deselected])
	const selectedCount = selectedIndexes.length
	const allSelected = indexes.length > 0 && selectedCount === indexes.length

	const toggle = useCallback((index: number) => {
		setState(current => {
			const next = new Set(current.deselected)

			if (!next.delete(index)) {
				next.add(index)
			}

			return { ...current, deselected: next }
		})
	}, [])

	const toggleAll = useCallback(() => {
		setState(current => {
			const everySelected = current.indexes.every(index => !current.deselected.has(index))

			return { ...current, deselected: everySelected ? new Set(current.indexes) : new Set() }
		})
	}, [])

	return useMemo(
		() => ({
			selectedIndexes,
			selectedCount,
			allSelected,
			someSelected: selectedCount > 0 && !allSelected,
			isSelected: (index: number) => !deselected.has(index),
			toggle,
			toggleAll
		}),
		[selectedIndexes, selectedCount, allSelected, deselected, toggle, toggleAll]
	)
}
