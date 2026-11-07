import { snapOffset, snapWidth } from "../core/snap";
import { type Channel, sumAt, type Term } from "../core/term";

/**
 * What the Table last wrote on one element, by property. A write that
 * would set what is already there is skipped, so a value that holds still
 * (a stacking order waiting for its switch, a settled lean) restyles
 * nothing.
 */
export type Written = Map<string, string>;

const writtenBy = new WeakMap<HTMLElement, Written>();

/** What the Table last wrote on `el`, for an element that keeps no state of its own. */
export function writtenOn(el: HTMLElement): Written {
	let written = writtenBy.get(el);
	if (!written) {
		written = new Map();
		writtenBy.set(el, written);
	}
	return written;
}

export function setWritten(
	style: CSSStyleDeclaration,
	written: Written,
	prop: string,
	value: string | null,
) {
	if (value === null) {
		if (written.delete(prop)) style.removeProperty(prop);
		return;
	}
	if (written.get(prop) === value) return;
	style.setProperty(prop, value);
	written.set(prop, value);
}

/** Where each snapped channel's move started, from its rest. */
export type Spans = Partial<Record<"x" | "y" | "width" | "height", number>>;

/**
 * A channel's offset as it is written: the box's place, height and a
 * Part's offset in whole device pixels from the rest, its width in even
 * ones, each never rounded back past where its move started (#1311 rule
 * 6); every other channel as it is.
 */
function snapped(
	channel: Channel,
	value: number,
	spans: Spans,
	dpr: number,
): number {
	if (channel === "width") return snapWidth(value, spans.width ?? value, dpr);
	if (channel === "x" || channel === "y" || channel === "height")
		return snapOffset(value, spans[channel] ?? value, dpr);
	return value;
}

/** Each channel's offset at `now`: where a move starting now starts from. */
export function spansAt(terms: readonly Term[], now: number): Spans {
	return {
		x: sumAt(terms, "x", now),
		y: sumAt(terms, "y", now),
		width: sumAt(terms, "width", now),
		height: sumAt(terms, "height", now),
	};
}

/** One frame's offsets, snapped, or `null` on a channel with no live Term. */
function offsetsAt(
	terms: readonly Term[],
	now: number,
	spans: Spans,
	dpr: number,
) {
	return (channel: Channel): number | null =>
		terms.some((term) => term.channel === channel)
			? snapped(channel, sumAt(terms, channel, now), spans, dpr)
			: null;
}

/**
 * What a Body stands on while it moves: the rotation, scale and opacity
 * its offsets add to (physical degrees), and, held or leaving, its hand
 * box's offset from its seat; `null` at rest, where its Slot is the box.
 */
export type Stance = {
	readonly rotate: number;
	readonly scale: number;
	readonly opacity: number;
	readonly at: { readonly x: number; readonly y: number } | null;
};

/**
 * A Body's frame, written straight on its own transform properties, its
 * opacity and its size: never as custom properties, since a change of one
 * restyles every element of the Body's faces, about 0.1 ms a Body a frame
 * on a full Table. A property with no live offset is left to the
 * stylesheet's rest, unless the Body stands on a hand box.
 */
export function writeBody(
	style: CSSStyleDeclaration,
	written: Written,
	terms: readonly Term[],
	now: number,
	spans: Spans,
	dpr: number,
	stance: Stance,
) {
	const offset = offsetsAt(terms, now, spans, dpr);
	const held = stance.at !== null;
	const x = offset("x");
	const y = offset("y");
	const rotate = offset("rotate");
	const lift = offset("lift");
	const opacity = offset("opacity");
	const width = offset("width");
	const height = offset("height");
	const set = (prop: string, value: string | null) =>
		setWritten(style, written, prop, value);
	set(
		"translate",
		held || x !== null || y !== null
			? `${(stance.at?.x ?? 0) + (x ?? 0)}px ${(stance.at?.y ?? 0) + (y ?? 0)}px`
			: null,
	);
	set(
		"rotate",
		held || rotate !== null ? `${stance.rotate + (rotate ?? 0)}deg` : null,
	);
	set(
		"scale",
		held || lift !== null ? String(stance.scale * (1 + (lift ?? 0))) : null,
	);
	set(
		"opacity",
		held || opacity !== null
			? String(stance.opacity + (opacity ?? 0))
			: null,
	);
	set("width", width === null ? null : `calc(100% + ${width}px)`);
	set("height", height === null ? null : `calc(100% + ${height}px)`);
}

/** A Part's offset in its Body and its fade, straight on the Part. */
export function writePart(
	style: CSSStyleDeclaration,
	written: Written,
	terms: readonly Term[],
	now: number,
	spans: Spans,
	dpr: number,
) {
	const offset = offsetsAt(terms, now, spans, dpr);
	const x = offset("x");
	const y = offset("y");
	const opacity = offset("opacity");
	setWritten(
		style,
		written,
		"translate",
		x !== null || y !== null ? `${x ?? 0}px ${y ?? 0}px` : null,
	);
	setWritten(
		style,
		written,
		"opacity",
		opacity === null ? null : String(1 + opacity),
	);
}

/**
 * A seat's stacking order while its Body's changes, it is raised or it
 * stands on a hand box (`base`); `null` leaves it to the stylesheet's
 * rest. A seat is anchored, so any write on it lays every anchored Body
 * out again: it changes only at those switches.
 */
export function seatZ(
	terms: readonly Term[],
	now: number,
	rest: number,
	base: number | null,
): string | null {
	const changing = terms.some((term) => term.channel === "z");
	const raised = terms.some((term) => term.raise);
	if (base === null && !changing && !raised) return null;
	const z = (base ?? rest) + (changing ? sumAt(terms, "z", now) : 0);
	return String(Math.round(z) + (base === null && raised ? 1000 : 0));
}
