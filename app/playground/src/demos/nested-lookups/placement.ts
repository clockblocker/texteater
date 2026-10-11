import type { CSSProperties } from "react";

/** A lookup surface's box, in physical px within the reader's content. */
export type Box = {
	readonly left: number;
	readonly top: number;
	readonly width: number;
};

const margin = 8;
const gap = 6;

function surfaceWidth(containerWidth: number): number {
	return Math.max(0, Math.min(352, containerWidth - 2 * margin));
}

function clampLeft(left: number, width: number, containerWidth: number) {
	return Math.min(
		Math.max(left, margin),
		Math.max(margin, containerWidth - width - margin),
	);
}

/**
 * Just under the anchor, its inline-start edge on the anchor's, clamped
 * into the container. Over a parent popover this covers it, as Yomitan's
 * and KOReader's child popups do.
 */
export function placeUnder(
	anchor: DOMRect,
	containerWidth: number,
	dir: "ltr" | "rtl",
): Box {
	const width = surfaceWidth(containerWidth);
	const left = dir === "rtl" ? anchor.right - width : anchor.left;
	return {
		left: clampLeft(left, width, containerWidth),
		top: anchor.bottom + gap,
		width,
	};
}

/**
 * Beside the parent, past its inline-end edge (else its inline-start
 * edge), level with the anchor. Null when neither side has room.
 */
export function placeBeside(
	parent: Box,
	anchor: DOMRect,
	containerWidth: number,
	dir: "ltr" | "rtl",
): Box | null {
	const width = surfaceWidth(containerWidth);
	const after = parent.left + parent.width + gap;
	const before = parent.left - width - gap;
	const sides = dir === "rtl" ? [before, after] : [after, before];
	const left = sides.find(
		(candidate) =>
			candidate >= margin && candidate + width <= containerWidth - margin,
	);
	if (left === undefined) return null;
	return { left, top: Math.max(parent.top, anchor.top - 20), width };
}

/** `box` as logical inset styles for an absolutely placed surface. */
export function boxStyle(
	box: Box,
	containerWidth: number,
	dir: "ltr" | "rtl",
): CSSProperties {
	return {
		insetInlineStart:
			dir === "rtl" ? containerWidth - box.left - box.width : box.left,
		top: box.top,
		width: box.width,
	};
}
