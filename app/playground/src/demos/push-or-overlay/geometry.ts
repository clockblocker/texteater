import { useEffect, useState } from "react";

export type WordState = "clear" | "nudged" | "covered";

/** Room kept between a nudged word and the pane's edge or the body's. */
const clearance = 16;

/**
 * How far to slide the text so the word, at `left`…`right` in a body
 * `width` wide, clears a pane `paneWidth` wide on the inline end, and
 * whether the word ends up clear, nudged or still covered. Positions are
 * physical px from the body's left edge, before any slide.
 */
export function placeWord({
	left,
	right,
	width,
	paneWidth,
	dir,
	nudge,
}: {
	readonly left: number;
	readonly right: number;
	readonly width: number;
	readonly paneWidth: number;
	readonly dir: "ltr" | "rtl";
	readonly nudge: boolean;
}): { readonly shift: number; readonly state: WordState } {
	const rtl = dir === "rtl";
	let shift = 0;
	if (nudge)
		shift = rtl
			? Math.max(
					0,
					Math.min(
						paneWidth + clearance - left,
						width - clearance - right,
					),
				)
			: Math.min(
					0,
					Math.max(
						width - paneWidth - clearance - right,
						clearance - left,
					),
				);
	const covered = rtl
		? left + shift < paneWidth
		: right + shift > width - paneWidth;
	if (covered) return { shift, state: "covered" };
	return { shift, state: shift === 0 ? "clear" : "nudged" };
}

/** `element`'s inline size, kept current with a ResizeObserver. */
export function useInlineSize(element: Element | null): number {
	const [size, setSize] = useState(0);
	useEffect(() => {
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => {
			const box = entry?.borderBoxSize[0];
			if (box) setSize(Math.round(box.inlineSize));
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [element]);
	return size;
}
