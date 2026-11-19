interface Box {
	type: string
	start: number
	end: number
}

function readBoxes(view: DataView, start: number, end: number): Box[] {
	const boxes: Box[] = []
	let offset = start
	while (offset + 8 <= end) {
		const size = view.getUint32(offset)
		const type = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset + 4, 4))
		if (size < 8 || offset + size > end) throw new Error(`Broken MP4 box "${type}" at ${offset}`)
		boxes.push({ type, start: offset, end: offset + size })
		offset += size
	}
	return boxes
}

/** Minimal MP4 sanity check: top-level box types, track count and the movie duration in seconds. */
export function inspectMp4(bytes: Uint8Array): { boxes: string[]; trackCount: number; durationSeconds: number } {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	const top = readBoxes(view, 0, bytes.byteLength)
	const moov = top.find(box => box.type === 'moov')
	const moovChildren = moov ? readBoxes(view, moov.start + 8, moov.end) : []
	const mvhd = moovChildren.find(box => box.type === 'mvhd')
	if (!mvhd) throw new Error('MP4 has no moov/mvhd')

	// mvhd v0: version+flags(4), creation(4), modification(4), timescale(4), duration(4)
	const version = view.getUint8(mvhd.start + 8)
	const timescale = view.getUint32(mvhd.start + (version === 1 ? 28 : 20))
	const duration = version === 1 ? Number(view.getBigUint64(mvhd.start + 32)) : view.getUint32(mvhd.start + 24)

	return {
		boxes: top.map(box => box.type),
		trackCount: moovChildren.filter(box => box.type === 'trak').length,
		durationSeconds: duration / timescale
	}
}
