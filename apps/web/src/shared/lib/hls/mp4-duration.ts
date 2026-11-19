const CONTAINER_BOXES = new Set(['moov', 'trak', 'mdia'])
const MAX_UINT32 = 0xffffffff

interface Box {
	type: string
	offset: number
	size: number
}

function readBoxes(view: DataView, start: number, end: number, boxes: Box[] = []): Box[] {
	let offset = start

	while (offset + 8 <= end) {
		const size = view.getUint32(offset)

		if (size < 8 || offset + size > end) {
			break
		}

		const type = String.fromCharCode(
			view.getUint8(offset + 4),
			view.getUint8(offset + 5),
			view.getUint8(offset + 6),
			view.getUint8(offset + 7)
		)

		boxes.push({ type, offset, size })

		if (CONTAINER_BOXES.has(type)) {
			readBoxes(view, offset + 8, offset + size, boxes)
		}

		offset += size
	}

	return boxes
}

/** Full box layout: 8 bytes header, version (1) + flags (3), then v0 = 32-bit / v1 = 64-bit times. */
function writeDuration(view: DataView, box: Box, duration: number) {
	const version = view.getUint8(box.offset + 8)
	const fields = box.offset + 12
	// mvhd / mdhd: creation, modification, timescale, duration
	// tkhd:        creation, modification, track_ID, reserved, duration
	const timeSize = version === 1 ? 8 : 4
	const durationOffset = box.type === 'tkhd' ? fields + timeSize * 2 + 8 : fields + timeSize * 2 + 4

	if (version === 1) {
		view.setBigUint64(durationOffset, BigInt(duration))
	} else {
		view.setUint32(durationOffset, Math.min(duration, MAX_UINT32 - 1))
	}
}

function readTimescale(view: DataView, box: Box): number {
	const version = view.getUint8(box.offset + 8)
	const timeSize = version === 1 ? 8 : 4

	return view.getUint32(box.offset + 12 + timeSize * 2)
}

/**
 * mux.js writes "unknown" (0xffffffff) durations into the init segment, so
 * players show a wrong length for the saved file. Fills mvhd, tkhd and mdhd
 * with the real duration. Returns a patched copy.
 */
export function setMp4Duration(initSegment: Uint8Array<ArrayBuffer>, durationSeconds: number): Uint8Array<ArrayBuffer> {
	const patched = initSegment.slice()
	const view = new DataView(patched.buffer, patched.byteOffset, patched.byteLength)
	const boxes = readBoxes(view, 0, patched.byteLength)
	const mvhd = boxes.find(box => box.type === 'mvhd')

	if (!mvhd) {
		return patched
	}

	const movieTimescale = readTimescale(view, mvhd)
	const movieDuration = Math.round(durationSeconds * movieTimescale)

	writeDuration(view, mvhd, movieDuration)

	for (const box of boxes) {
		if (box.type === 'tkhd') {
			writeDuration(view, box, movieDuration)
		}

		if (box.type === 'mdhd') {
			writeDuration(view, box, Math.round(durationSeconds * readTimescale(view, box)))
		}
	}

	return patched
}
