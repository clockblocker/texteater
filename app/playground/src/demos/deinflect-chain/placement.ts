/**
 * hover-preview's "beside the sentence" placement (itself never-cover-word's),
 * copied because demos don't import each other: the popover goes in the
 * text column's margin beside the sentence when there is room, else below or
 * above the sentence, and when neither side fits it whole it asks the
 * text to scroll the sentence up. Everything is in logical px inside the
 * reading viewport: `start` runs from its inline-start edge, so an RTL
 * frame mirrors without a second code path.
 */

export type Box = {
	readonly start: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

export type Scene = {
	readonly view: { readonly width: number; readonly height: number };
	/** The clicked word. */
	readonly word: Box;
	/** The sentence's line boxes, one per line it wraps onto. */
	readonly lines: readonly Box[];
	/** The text column, whose margins are where a side placement goes. */
	readonly column: Box;
	/** The popover's preferred width and its height when nothing clamps it. */
	readonly stack: { readonly width: number; readonly height: number };
	/** How far the text can scroll back (up) and forward (down), in px. */
	readonly scrollRoom: { readonly back: number; readonly forward: number };
};

export type Placement = {
	/** The popover's box; its height is what it shows, at most `maxHeight`. */
	readonly box: Box;
	readonly maxHeight: number;
	/**
	 * Block px the text should scroll so the popover fits clear of the
	 * sentence; 0 when it already does.
	 */
	readonly scrollBy: number;
};

const margin = 8;
const gap = 8;
/** Narrower than this, a side column is no place for a Card. */
const minSideWidth = 260;
/** The least a popover shows even when that means covering text. */
const minStackHeight = 96;

const bottomOf = (box: Box) => box.top + box.height;
const endOf = (box: Box) => box.start + box.width;
const clamp = (value: number, low: number, high: number) =>
	Math.min(Math.max(value, low), Math.max(low, high));

function bounds(boxes: readonly Box[]): Box {
	const top = Math.min(...boxes.map((box) => box.top));
	const start = Math.min(...boxes.map((box) => box.start));
	return {
		start,
		top,
		width: Math.max(...boxes.map(endOf)) - start,
		height: Math.max(...boxes.map(bottomOf)) - top,
	};
}

export function beside(scene: Scene): Placement {
	const sentence = bounds(
		scene.lines.length > 0 ? scene.lines : [scene.word],
	);
	const { view, stack, column } = scene;

	// The side goes in the column's margin, so it covers no other line.
	const endRoom = view.width - margin - (endOf(column) + gap);
	const startRoom = column.start - gap - margin;
	if (Math.max(endRoom, startRoom) >= minSideWidth) {
		const atEnd = endRoom >= startRoom;
		const width = Math.min(stack.width, atEnd ? endRoom : startRoom);
		const maxHeight = view.height - 2 * margin;
		const height = Math.min(stack.height, maxHeight);
		return {
			box: {
				start: atEnd ? endOf(column) + gap : column.start - gap - width,
				top: clamp(
					scene.word.top - 12,
					margin,
					view.height - margin - height,
				),
				width,
				height,
			},
			maxHeight,
			scrollBy: 0,
		};
	}

	const width = Math.min(stack.width, view.width - 2 * margin);
	const start = clamp(scene.word.start, margin, view.width - margin - width);
	const below = view.height - margin - (bottomOf(sentence) + gap);
	const above = sentence.top - gap - margin;
	const placeBelow = (maxHeight: number, scrollBy = 0): Placement => {
		const height = Math.min(stack.height, maxHeight);
		return {
			box: {
				start,
				top: Math.min(
					bottomOf(sentence) + gap - scrollBy,
					view.height - margin - height,
				),
				width,
				height,
			},
			maxHeight,
			scrollBy,
		};
	};
	const placeAbove = (maxHeight: number): Placement => {
		const height = Math.min(stack.height, maxHeight);
		return {
			box: {
				start,
				top: Math.max(sentence.top - gap - height, margin),
				width,
				height,
			},
			maxHeight,
			scrollBy: 0,
		};
	};

	if (stack.height <= below) return placeBelow(below);
	if (stack.height <= above) return placeAbove(above);

	// Neither side fits it whole: scroll the sentence up to the top margin,
	// when that gives more room than either side has now.
	const scrollBy = clamp(
		sentence.top - margin,
		-scene.scrollRoom.back,
		scene.scrollRoom.forward,
	);
	const belowAfter = below + scrollBy;
	if (scrollBy !== 0 && belowAfter > Math.max(below, above))
		return placeBelow(Math.max(belowAfter, minStackHeight), scrollBy);
	return below >= above
		? placeBelow(Math.max(below, minStackHeight))
		: placeAbove(Math.max(above, minStackHeight));
}
