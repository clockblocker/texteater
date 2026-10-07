import { restingCards, type WritingDirection } from "compass";
import type { RefObject } from "react";
import type { Destination, Drag, NoteHandle } from "./gesture";
import type { NoteMoves } from "./note-moves";
import { findSheet } from "./sheets";
import type { CompassWorkspace } from "./use-compass-workspace";
import type { GestureState } from "./use-gesture-state";
import type { WorkspaceCommands } from "./use-workspace-commands";

/**
 * Letting go: what a release sends the reducer and how the Card gets
 * there. `useDrag` decides which release it is (`releaseOf`); this does
 * it. The keyboard's Lift lets go through the same `commitAt` and
 * `releaseInPlace`.
 */
export function useRelease<S>({
	workspace,
	gesture,
	moves,
	commands,
	handles,
	direction,
}: {
	workspace: CompassWorkspace<S>;
	gesture: GestureState<S>;
	moves: NoteMoves;
	commands: WorkspaceCommands<S>;
	handles: RefObject<Map<string, NoteHandle>>;
	direction: WritingDirection;
}) {
	const { current, dispatch } = workspace;
	const { dragRef } = gesture;

	/**
	 * Let go with nowhere to be, for a Card whose home is away: a loose
	 * Card vanishes, and a lifted Cover with no Deck to go back to closes,
	 * as ← would. Either way it fades where it is.
	 */
	function leave(d: Drag<S>) {
		dispatch({ type: "Release" });
		gesture.settle(
			() => moves.fade(d.h),
			() => {},
		);
	}
	/** A lifted Sheet let go with nowhere to be: it is the Sheet again. */
	function restore(d: Drag<S>) {
		moves.resetTransforms(d.h);
		dispatch({ type: "CancelGesture" });
		gesture.tearDown();
	}
	/** A release with nothing under it, or in the Card's own Pane. */
	function goHome(d: Drag<S>) {
		if (d.home === "slot") {
			dispatch({ type: "Release" });
			gesture.snapBack(d.h);
		} else if (d.home === "restore") restore(d);
		else leave(d);
	}
	/** Whole-Deck swipe: the held Card and its Deck fly together. */
	function sweepByDrag(d: Drag<S>) {
		if (d.deckSheet === null) return;
		const layout = current().layout;
		const sheet = findSheet(layout, d.deckSheet);
		if (!sheet?.deck) return;
		const fly = restingCards(layout, sheet.deck).flatMap((card) => {
			const h = handles.current.get(card.id);
			return h ? [moves.flight(h, direction)] : [];
		});
		commands.sweep(d.deckSheet, () => Promise.all(fly));
	}
	/**
	 * The Note stays exactly where the hand left it and grows from there:
	 * its drag offset is folded into its box, and the state change gives it
	 * a new target box to animate to.
	 */
	function growFromHand(d: Drag<S>, commit: () => void) {
		moves.foldOffset(d.h);
		dragRef.current = null;
		gesture.setDrag(null);
		gesture.setDestination(null);
		gesture.setPastCommit(false);
		commit();
		/* a loose Card is a Sheet now; its Presentation lives in the layout */
		gesture.setLoose(null);
	}

	return {
		restore,
		sweepByDrag,
		/** Let go over `target`: do what the preview showed. */
		commitAt(d: Drag<S>, target: Destination | null) {
			if (!target || target.kind === "return" || target.kind === "home") {
				goHome(d);
				return;
			}
			if (target.kind === "sheet")
				growFromHand(d, () => commands.openCover(target.paneId));
			else
				growFromHand(d, () =>
					commands.splitPane(target.paneId, target.edge, target.size),
				);
		},
		/**
		 * Let go of a Sheet that never left its bar's slop: a tap on a bar is
		 * not a close, so a Sheet that would close stays a Sheet.
		 */
		releaseInPlace(d: Drag<S>) {
			if (d.home === "close") restore(d);
			else goHome(d);
		},
	};
}
