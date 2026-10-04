import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import {
	type Box,
	isNarrow,
	sameBoxes,
	type WritingDirection,
} from "react-resizable-panels/workspace";
import { directionOf, remPx, viewportWidth } from "./layout";

/**
 * Every drawn Pane's box, relative to the frame, kept fresh, with what
 * else only the page knows: the root font size, the frame's writing
 * direction, and whether the screen is narrow. Notes are placed from
 * these.
 */
export function usePaneBoxes(
	frame: RefObject<HTMLElement | null>,
	/** What is laid out now; a change re-measures. */
	displayLayout: unknown,
	/** A preview has moved the Panes, so the rest boxes wait it out. */
	previewUp: boolean,
	activePaneId: string,
) {
	const [paneBoxes, setPaneBoxes] = useState<Readonly<Record<string, Box>>>(
		{},
	);
	/**
	 * The Panes' boxes as they rested before any preview moved them: what
	 * a drop is read against, and where the zones are drawn, for the whole
	 * of a drag. Measured only while no preview is up.
	 */
	const [restBoxes, setRestBoxes] = useState<Readonly<Record<string, Box>>>(
		{},
	);
	const previewUpRef = useRef(previewUp);
	previewUpRef.current = previewUp;
	const [rem, setRem] = useState(16);
	/** The frame's writing direction: which physical side each logical edge is on. */
	const [direction, setDirection] = useState<WritingDirection>("ltr");
	/** Below `md`: one Pane, no splits, no side edges (tf-demo ADR 0008). */
	const [narrow, setNarrow] = useState(false);
	/**
	 * Bumped whenever a Pane's box changes: a split, a preview, a handle
	 * drag, the window. A Note whose box changes in the same pass is being
	 * resized with its Pane, not moved, and jumps rather than morphs.
	 */
	const [layoutEpoch, setLayoutEpoch] = useState(0);

	useLayoutEffect(() => {
		const root = frame.current;
		if (!root) return;
		const measure = () => {
			const frameBox = root.getBoundingClientRect();
			const next: Record<string, Box> = {};
			for (const element of root.querySelectorAll<HTMLElement>(
				"[data-deck-pane]",
			)) {
				const r = element.getBoundingClientRect();
				next[element.dataset.deckPane ?? ""] = {
					left: r.left - frameBox.left,
					top: r.top - frameBox.top,
					width: r.width,
					height: r.height,
				};
			}
			const size = remPx();
			setRem(size);
			setDirection(directionOf(root));
			setNarrow(isNarrow(viewportWidth(), size));
			setPaneBoxes((current) => {
				const same = sameBoxes(current, next);
				if (!same) setLayoutEpoch((epoch) => epoch + 1);
				return same ? current : next;
			});
			if (!previewUpRef.current)
				setRestBoxes((current) =>
					sameBoxes(current, next) ? current : next,
				);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(root);
		for (const element of root.querySelectorAll("[data-deck-pane]"))
			observer.observe(element);
		return () => observer.disconnect();
	}, [frame, displayLayout, narrow, activePaneId]);

	return { paneBoxes, restBoxes, rem, direction, narrow, layoutEpoch };
}
