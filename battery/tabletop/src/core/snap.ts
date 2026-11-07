/**
 * Device-pixel snapping relative to the rest (#1311 rule 6). A moving
 * offset is written as a whole number of device pixels from its rest, so
 * the Body keeps its rest's sub-pixel phase on every frame, its edges and
 * its text round the same way each frame, and nothing in it shimmies
 * against its edges. It lands exactly on its rest.
 */

/** `value` on the device's pixel grid. */
export function snapPx(value: number, dpr: number): number {
	const snapped = Math.round(value * dpr) / dpr;
	return snapped === 0 ? 0 : snapped;
}

/**
 * An offset from its rest on the device's grid, never rounded back past
 * `from`, where its move started: a move that starts off the grid shows
 * its start until the grid is on its way, rather than stepping back onto
 * it, and the frame that starts it shows exactly where it was. Past `from`
 * on a path that leaves it, and past the rest, it snaps freely.
 */
export function snapOffset(offset: number, from: number, dpr: number): number {
	if (offset === from) return from;
	const snapped = snapPx(offset, dpr);
	if (from >= 0) return offset <= from && snapped > from ? from : snapped;
	return offset >= from && snapped < from ? from : snapped;
}

/**
 * A width's offset in even device pixels, so a box centred on its rest,
 * and a column centred in it, move by whole device pixels too.
 */
export function snapWidth(offset: number, from: number, dpr: number): number {
	return 2 * snapOffset(offset / 2, from / 2, dpr);
}
