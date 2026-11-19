export class UnsupportedPlaylistError extends Error {
	override readonly name = 'UnsupportedPlaylistError'
}

/** A segment the CDN returned successfully but that is not playable MPEG-TS (empty, HTML, no media). */
export class InvalidSegmentError extends Error {
	override readonly name = 'InvalidSegmentError'
}
