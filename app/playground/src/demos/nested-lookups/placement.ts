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
 * into the container.
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
