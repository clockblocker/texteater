/**
 * Where a resting Note sits in its Pane, written once and read two ways:
 * as px, against a measured Pane box, for what a gesture computes, and as
 * CSS, against the Pane's element, for what the page draws. The CSS reads
 * the Pane through anchor positioning (`anchor()` and `anchor-size()`), so
 * the browser resolves a resting Note in the same layout pass as the Pane
 * it sits in: a zoom, a window resize or a Split resize never draws a Note
 * in its Pane's old box.
 *
 * A placement's lengths are expressions over the root size and the Pane's
 * size, so the two readings cannot drift apart.
 */

import type { Box, WritingDirection } from "./geometry";

/**
 * A length against one Pane: `rem` root sizes plus `width` and `height`
 * times the Pane's, or a sum, a multiple, a least or a greatest of such.
 */
export type Length =
	| {
			readonly kind: "linear";
			readonly rem: number;
			readonly width: number;
			readonly height: number;
	  }
	| { readonly kind: "sum"; readonly of: readonly Length[] }
	| { readonly kind: "times"; readonly by: number; readonly of: Length }
	| { readonly kind: "min" | "max"; readonly of: readonly Length[] };

/** `n` root sizes. */
export function inRem(n: number): Length {
	return { kind: "linear", rem: n, width: 0, height: 0 };
}
/** The Pane's width. */
export const paneWidth: Length = {
	kind: "linear",
	rem: 0,
	width: 1,
	height: 0,
};
/** The Pane's height. */
export const paneHeight: Length = {
	kind: "linear",
	rem: 0,
	width: 0,
	height: 1,
};
export function plus(...of: readonly Length[]): Length {
	return { kind: "sum", of };
}
export function times(by: number, of: Length): Length {
	return { kind: "times", by, of };
}
export function minus(a: Length, b: Length): Length {
	return plus(a, times(-1, b));
}
export function least(...of: readonly Length[]): Length {
	return { kind: "min", of };
}
export function greatest(...of: readonly Length[]): Length {
	return { kind: "max", of };
}

/**
 * A Note's place in a Pane: how far its inline-start edge sits from the
 * Pane's, how far its top sits below the Pane's, and its size.
 */
export type Placement = {
	readonly inlineStart: Length;
	readonly top: Length;
	readonly width: Length;
	readonly height: Length;
};

/** A length in px, in a Pane `pane` px across at the `rem` given. */
export function lengthPx(
	length: Length,
	pane: { readonly width: number; readonly height: number },
	rootPx: number,
): number {
	switch (length.kind) {
		case "linear":
			return (
				length.rem * rootPx +
				length.width * pane.width +
				length.height * pane.height
			);
		case "sum":
			return length.of.reduce(
				(total, term) => total + lengthPx(term, pane, rootPx),
				0,
			);
		case "times":
			return length.by * lengthPx(length.of, pane, rootPx);
		case "min":
			return Math.min(
				...length.of.map((term) => lengthPx(term, pane, rootPx)),
			);
		case "max":
			return Math.max(
				...length.of.map((term) => lengthPx(term, pane, rootPx)),
			);
	}
}

/**
 * A placement's box in px, in the coordinates `pane` was measured in. In
 * right-to-left text the inline-start edge is the Pane's right one.
 */
export function placementBox(
	placement: Placement,
	pane: Box,
	rootPx: number,
	direction: WritingDirection = "ltr",
): Box {
	const start = lengthPx(placement.inlineStart, pane, rootPx);
	const width = lengthPx(placement.width, pane, rootPx);
	return {
		left:
			direction === "rtl"
				? pane.left + pane.width - start - width
				: pane.left + start,
		top: pane.top + lengthPx(placement.top, pane, rootPx),
		width,
		height: lengthPx(placement.height, pane, rootPx),
	};
}

/**
 * The CSS that places a Note: logical, so it holds in either writing
 * direction. The Note must be absolutely positioned in a containing block
 * the Pane's element is inside of.
 */
export type PlacementStyle = {
	readonly insetInlineStart: string;
	readonly top: string;
	readonly width: string;
	readonly height: string;
};

/**
 * The anchor name a Pane's element carries, for `anchor-name`. Pane ids
 * are the model's to mint, so anything an ident cannot hold is replaced.
 */
export function paneAnchor(paneId: string): string {
	return `--pane-${paneId.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

/**
 * Which property a length is printed for. An inset may read only the
 * anchor's edges on its own axis; a size reads the anchor's size.
 */
type Context = "inline" | "block" | "size";

function cssOf(length: Length, anchor: string, context: Context): string {
	switch (length.kind) {
		case "linear":
			return linearCss(length, anchor, context);
		case "sum":
			return `(${length.of.map((term) => cssOf(term, anchor, context)).join(" + ")})`;
		case "times":
			return `(${length.by.toString()} * ${cssOf(length.of, anchor, context)})`;
		case "min":
		case "max":
			return `${length.kind}(${length.of.map((term) => cssOf(term, anchor, context)).join(", ")})`;
	}
}

function linearCss(
	length: Extract<Length, { kind: "linear" }>,
	anchor: string,
	context: Context,
): string {
	const terms: string[] = [];
	if (length.rem !== 0) terms.push(`${length.rem.toString()}rem`);
	for (const axis of ["width", "height"] as const) {
		const by = length[axis];
		if (by === 0) continue;
		terms.push(
			by === 1
				? paneSizeCss(axis, anchor, context)
				: `${by.toString()} * ${paneSizeCss(axis, anchor, context)}`,
		);
	}
	if (terms.length === 0) return "0px";
	return terms.length === 1 ? (terms[0] as string) : `(${terms.join(" + ")})`;
}

/**
 * The Pane's width or height. `anchor-size()` reads it in a size; an inset
 * takes it as the distance between the anchor's two edges on its own axis,
 * the only anchor functions an inset can use everywhere.
 */
function paneSizeCss(
	axis: "width" | "height",
	anchor: string,
	context: Context,
): string {
	if (context === "size") return `anchor-size(${anchor} ${axis})`;
	if (context === "inline" && axis === "width")
		return `(anchor(${anchor} end) - anchor(${anchor} start))`;
	if (context === "block" && axis === "height")
		return `(anchor(${anchor} bottom) - anchor(${anchor} top))`;
	throw new Error(`An ${context} inset cannot read its Pane's ${axis}.`);
}

/** A placement as CSS against the Pane anchored as `anchor` (see `paneAnchor`). */
export function placementStyle(
	placement: Placement,
	anchor: string,
): PlacementStyle {
	return {
		insetInlineStart: `calc(anchor(${anchor} start) + ${cssOf(placement.inlineStart, anchor, "inline")})`,
		top: `calc(anchor(${anchor} top) + ${cssOf(placement.top, anchor, "block")})`,
		width: `calc(${cssOf(placement.width, anchor, "size")})`,
		height: `calc(${cssOf(placement.height, anchor, "size")})`,
	};
}

/**
 * A box measured in px, as CSS: for a Note held where a gesture put it
 * rather than where a Pane places it. `box` is in the coordinates of the
 * Note's containing block; in right-to-left text inline-start is measured
 * from that block's right edge.
 */
export function boxStyle(
	box: Box,
	direction: WritingDirection,
): PlacementStyle {
	return {
		insetInlineStart:
			direction === "rtl"
				? `calc(100% - ${(box.left + box.width).toString()}px)`
				: `${box.left.toString()}px`,
		top: `${box.top.toString()}px`,
		width: `${box.width.toString()}px`,
		height: `${box.height.toString()}px`,
	};
}
