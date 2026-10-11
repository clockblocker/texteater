/** Where a peek sits in the reading column, in its coordinates. */
export type PeekPlacement = {
	readonly width: number;
	/** From the column's inline-start edge. */
	readonly start: number;
	readonly maxHeight: number;
} & (
	| { readonly side: "below"; readonly top: number }
	| { readonly side: "above"; readonly bottom: number }
);

const margin = 8;
const gap = 6;
const maxWidth = 336;
/** Below the word unless less than this fits there and more fits above. */
const comfortableHeight = 280;
const minHeight = 160;
const maxHeight = 440;

const clamp = (value: number, min: number, max: number) =>
	Math.max(min, Math.min(value, Math.max(min, max)));

/**
 * A peek by the word: its inline-start edge near the word's, below the
 * word, or above it when there is more room there. It never leaves the
 * column, so a word scrolled out of view keeps its peek at the edge.
 */
export function placePeek(
	word: DOMRect,
	column: DOMRect,
	dir: "ltr" | "rtl",
): PeekPlacement {
	const width = Math.min(maxWidth, column.width - 2 * margin);
	const wordStart =
		dir === "rtl" ? column.right - word.right : word.left - column.left;
	const start = clamp(wordStart - 12, margin, column.width - width - margin);
	const top = word.top - column.top;
	const bottom = word.bottom - column.top;
	const roomBelow = column.height - bottom - gap - margin;
	const roomAbove = top - gap - margin;
	if (roomBelow >= comfortableHeight || roomBelow >= roomAbove)
		return {
			side: "below",
			width,
			start,
			top: clamp(
				bottom + gap,
				margin,
				column.height - minHeight - margin,
			),
			maxHeight: clamp(roomBelow, minHeight, maxHeight),
		};
	return {
		side: "above",
		width,
		start,
		bottom: clamp(
			column.height - top + gap,
			margin,
			column.height - minHeight - margin,
		),
		maxHeight: clamp(roomAbove, minHeight, maxHeight),
	};
}
