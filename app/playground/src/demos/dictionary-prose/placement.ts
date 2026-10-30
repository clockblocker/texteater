/**
 * never-cover-word's placement, by way of lemma-hop, copied because demos
 * don't import each other: where the floating Deck (here the Surface
 * popover) goes so it never covers the clicked word's sentence. Everything is in logical px inside the reading
 * viewport: `start` runs from the viewport's inline-start edge, `top` from
 * its top, so an RTL frame mirrors without a second code path.
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
	/** The stack's preferred width and its height when nothing clamps it. */
	readonly stack: { readonly width: number; readonly height: number };
	/** How far the text can scroll back (up) and forward (down), in px. */
	readonly scrollRoom: { readonly back: number; readonly forward: number };
};

export type Placement = {
	/** The stack's box; its height is what it shows, at most `maxHeight`. */
	readonly box: Box;
	readonly maxHeight: number;
	/** Where it landed, for the readout. */
	readonly where: string;
	/**
	 * Block px the text should scroll so the stack fits clear of the
	 * sentence; 0 when it already does.
	 */
	readonly scrollBy: number;
};

const margin = 8;
const gap = 8;
/** Narrower than this, a side column is no place for a Card. */
const minSideWidth = 260;
/** The least a stack shows even when that means covering text. */
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

function stackWidth(scene: Scene): number {
	return Math.min(scene.stack.width, scene.view.width - 2 * margin);
}

/** Inline-aligned to the word, kept inside the viewport. */
function startAtWord(scene: Scene, width: number): number {
	return clamp(scene.word.start, margin, scene.view.width - margin - width);
}

/**
 * KOReader-like: beside the sentence when the text column's margin has
 * room, else below or above it. When neither side fits the whole stack, it
 * asks the text to scroll the sentence to the top, as tf-demo's
 * `clearSentence` scrolls it clear of a docked Deck, and clamps the stack's
 * height only when scrolling can't make the room.
 */
export function placeBeside(scene: Scene): Placement {
	const sentence = bounds(
		scene.lines.length > 0 ? scene.lines : [scene.word],
	);
	const { view, stack } = scene;

	// The side goes in the column's margin, so it covers no other line.
	const { column } = scene;
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
			where: atEnd
				? "beside the sentence, end side"
				: "beside the sentence, start side",
			scrollBy: 0,
		};
	}

	const width = stackWidth(scene);
	const start = startAtWord(scene, width);
	const below = view.height - margin - (bottomOf(sentence) + gap);
	const above = sentence.top - gap - margin;
	const placeBelow = (
		maxHeight: number,
		scrollBy = 0,
		where = "below the sentence",
	) => {
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
			where,
			scrollBy,
		};
	};
	const placeAbove = (maxHeight: number) => {
		const height = Math.min(stack.height, maxHeight);
		return {
			box: {
				start,
				top: Math.max(sentence.top - gap - height, margin),
				width,
				height,
			},
			maxHeight,
			where: "above the sentence",
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
		return placeBelow(
			Math.max(belowAfter, minStackHeight),
			scrollBy,
			"below the sentence, text scrolled",
		);
	return below >= above
		? placeBelow(Math.max(below, minStackHeight))
		: placeAbove(Math.max(above, minStackHeight));
}

/** The parts of `boxes` the stack lies over, clipped to the viewport. */
export function covered(
	stack: Box,
	boxes: readonly Box[],
	view: Scene["view"],
): Box[] {
	const hits: Box[] = [];
	for (const box of boxes) {
		const start = Math.max(stack.start, box.start, 0);
		const top = Math.max(stack.top, box.top, 0);
		const end = Math.min(endOf(stack), endOf(box), view.width);
		const bottom = Math.min(bottomOf(stack), bottomOf(box), view.height);
		// A pixel of overlap is anti-aliasing, not a covered line.
		if (end - start > 2 && bottom - top > 2)
			hits.push({ start, top, width: end - start, height: bottom - top });
	}
	return hits;
}
