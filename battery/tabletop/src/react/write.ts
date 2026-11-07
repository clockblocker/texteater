import { type Move, partSumAt, sumAt } from "../core/move";
import { snapOffset, snapWidth } from "../core/snap";

/**
 * What the Table last wrote on one element, by property. A write that
 * would set what is already there is skipped, so a value that holds still
 * (a stacking order through a crossing, a settled lean) restyles nothing.
 */
export type Written = Map<string, string>;

const writtenBy = new WeakMap<Element, Written>();

/** What the Table last wrote on `el`, for an element that keeps no state of its own. */
export function writtenOn(el: Element): Written {
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

/** A Body's box offsets at `now`: where a Move starting now starts from. */
export function spansAt(moves: readonly Move[], now: number): Spans {
	return {
		x: sumAt(moves, "x", now),
		y: sumAt(moves, "y", now),
		width: sumAt(moves, "width", now),
		height: sumAt(moves, "height", now),
	};
}

/** A Part's offsets at `now`. */
export function partSpansAt(
	moves: readonly Move[],
	id: string,
	now: number,
): Spans {
	return {
		x: partSumAt(moves, id, "x", now),
		y: partSumAt(moves, id, "y", now),
	};
}

/**
 * A box offset as it is written: place, height and a Part's offset in
 * whole device pixels from the rest, the width in even ones, each never
 * rounded back past where its move started (#1311 rule 6).
 */
export function snapped(
	channel: "x" | "y" | "width" | "height",
	value: number,
	spans: Spans,
	dpr: number,
): number {
	if (channel === "width") return snapWidth(value, spans.width ?? value, dpr);
	return snapOffset(value, spans[channel] ?? value, dpr);
}
