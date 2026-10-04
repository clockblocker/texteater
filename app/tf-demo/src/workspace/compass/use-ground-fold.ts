import { type UIEvent, useState } from "react";
import {
	BAR_REM,
	groundOf,
	isRooted,
	type PaneNode,
} from "react-resizable-panels/workspace";
import { coverHeadingRem, foldedAt } from "./heading";

/**
 * A Floating Pane's bar is its Ground's Heading, so it takes the Heading's
 * fold: tall while the Ground's body rests at its top, folded to the bar's
 * height once it scrolls. A Rooted Pane's bar carries the trail and stays
 * a bar.
 */
export function useGroundFold() {
	/** Floating Panes whose Ground has scrolled far enough to fold its bar. */
	const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
	return {
		/** A Pane bar's height, in rem. */
		barRemOf<S>(pane: PaneNode<S> | null): number {
			if (!pane || isRooted(pane) || groundOf(pane).kind !== "Sheet")
				return BAR_REM;
			return coverHeadingRem(folded.has(pane.id));
		},
		/** A Floating Ground's body scrolled: its Pane bar folds, as a Cover's Heading does. */
		onScroll(event: UIEvent<HTMLElement>) {
			const scroller = event.target;
			if (
				!(scroller instanceof HTMLElement) ||
				!scroller.matches("[data-scroller]")
			)
				return;
			const paneId = scroller.closest<HTMLElement>('[data-form="ground"]')
				?.dataset.pane;
			if (!paneId) return;
			setFolded((current) => {
				const was = current.has(paneId);
				if (foldedAt(was, scroller.scrollTop) === was) return current;
				const next = new Set(current);
				if (was) next.delete(paneId);
				else next.add(paneId);
				return next;
			});
		},
	};
}
