import {
	type DealtCard,
	deckHolding,
	type Edge,
	findPane,
	groundOf,
	isRooted,
	type Presentation,
	restingCards,
} from "compass";
import { clearSentence } from "./clear-sentence";
import type { DeckInteraction } from "./interaction-policy";
import { findSheet, type SheetView, topSheetOf } from "./sheets";
import type { KeyedCard } from "./subject";
import type { CompassWorkspace } from "./use-compass-workspace";

/**
 * The workspace commands a reader's actions send. Gestures decide when;
 * these decide what the reducer is told.
 */
export function useWorkspaceCommands<S>({
	workspace,
	allows,
	smooth,
	deckTopOf,
	sweepAway,
}: {
	workspace: CompassWorkspace<S>;
	allows: (interaction: DeckInteraction) => boolean;
	/** Scrolls may glide: motion is not reduced. */
	smooth: boolean;
	/** Where a Pane's Deck starts, in viewport px. */
	deckTopOf: (paneId: string) => number | null;
	/** The Cards of a Deck leave for good; it ends once they have. */
	sweepAway: (
		cards: readonly Presentation<S>[],
		end: () => void,
		run?: () => Promise<unknown>,
	) => void;
}) {
	const { current, dispatch } = workspace;

	/** ← on a Ground: one rung down the line. The rung's Deck leaves with it. */
	function stepDown(paneId: string) {
		const pane = findPane(current().layout, paneId);
		if (!pane || pane.covers.length || pane.line.length < 2) return;
		dispatch({ type: "GoBack", sheetId: groundOf(pane).id });
	}
	/** ← on a Cover: Collapse when its Card is still on a live Deck, Close otherwise. */
	function leaveCover(cover: SheetView<S>) {
		if (!cover.presentation) return;
		dispatch({ type: "GoBack", sheetId: cover.sheetId });
	}
	/** X: a Floating Pane closes with its Covers and its Deck. */
	function closePane(paneId: string) {
		const pane = findPane(current().layout, paneId);
		if (!pane || isRooted(pane)) return;
		dispatch({ type: "ClosePane", paneId });
	}
	/** The Deck ends: every Card still on it flies off, then it is gone. */
	function sweep(sheetId: string, run?: () => Promise<unknown>) {
		const layout = current().layout;
		const sheet = findSheet(layout, sheetId);
		if (!sheet?.deck) return;
		const cards = restingCards(layout, sheet.deck);
		sweepAway(cards, () => dispatch({ type: "Sweep", sheetId }), run);
	}

	return {
		sweep,
		/** The Menu's tap: a Menu Item is the Ground's next rung. */
		openMenuItem(paneId: string, item: string) {
			dispatch({
				type: "StepUp",
				paneId,
				to: { kind: "MenuItem", item },
			});
		},
		/** A Menu Item's selection: it is the Ground's content now. */
		select(paneId: string, subject: S) {
			dispatch({
				type: "StepUp",
				paneId,
				to: { kind: "Sheet", subject },
			});
		},
		/** A Segment clicked in a Sheet deals a Deck that belongs to that Sheet. */
		deal(
			paneId: string,
			sheetId: string,
			selection: string,
			cards: readonly DealtCard<S>[],
			from: HTMLElement,
		) {
			if (!allows("deal")) return;
			const layout = current().layout;
			const pane = findPane(layout, paneId);
			if (!pane || topSheetOf(pane).sheetId !== sheetId) return;
			const deckTop = deckTopOf(paneId);
			if (deckTop !== null) clearSentence(from, deckTop, smooth);
			dispatch({ type: "Deal", sheetId, selection, cards });
		},
		/**
		 * A Presentation's Deck catches up with what it presents, such as
		 * a Resolution's progress: the live Deck holding its slot takes
		 * the Cards by key. It may run while a Card is in hand.
		 */
		reconcile(presentationId: string, cards: readonly KeyedCard<S>[]) {
			const holder = deckHolding(current().layout, presentationId);
			if (!holder?.deck) return;
			dispatch({
				type: "ReconcileDeck",
				deckId: holder.deck.id,
				cards,
			});
		},
		bringToFront(sheetId: string, card: Presentation<S>) {
			if (!allows("select")) return;
			dispatch({
				type: "BringToFront",
				sheetId,
				presentationId: card.id,
			});
		},
		/** A Link pushes a fresh Presentation as a Cover; Go to source is one. */
		follow(paneId: string, subject: S) {
			if (!allows("follow")) return;
			dispatch({ type: "FollowLink", paneId, subject });
		},
		/** A Cover is a form, not a move: a dealt Card keeps its rank in its Deck. */
		openCover(paneId: string) {
			dispatch({ type: "Expand", paneId });
		},
		/** A Card on a Deck opens over it at once: the keyboard's Expand. */
		expandCard(sheetId: string, card: Presentation<S>) {
			const sheet = findSheet(current().layout, sheetId);
			if (!sheet || !allows("expand")) return;
			const lifted = dispatch({
				type: "LiftCard",
				sheetId,
				presentationId: card.id,
			});
			if (!lifted.held) return;
			dispatch({ type: "Expand", paneId: sheet.paneId });
		},
		/** A Note or a Text dropped on an edge is the new Pane's Ground: a Floating Pane. */
		splitPane(paneId: string, edge: Edge, size: number) {
			dispatch({ type: "Expand", paneId, edge, size });
		},
		/** The Pane bar's control: the Ground's ←, or a Floating Pane's X. */
		back(paneId: string) {
			const pane = findPane(current().layout, paneId);
			if (!pane || !allows("collapse")) return;
			if (isRooted(pane)) {
				if (!pane.covers.length) stepDown(paneId);
			} else closePane(paneId);
		},
		/** A Cover bar's ←: only the top Cover's is reachable. */
		coverBack(paneId: string, sheetId: string) {
			const pane = findPane(current().layout, paneId);
			const top = pane ? topSheetOf(pane) : null;
			if (
				!top ||
				top.ground ||
				top.sheetId !== sheetId ||
				!allows("collapse")
			)
				return;
			leaveCover(top);
		},
		/**
		 * A Cover's ×: every Cover in the Pane leaves at once, each as its ←
		 * would, and the Ground is what remains.
		 */
		clearCovers(paneId: string) {
			const pane = findPane(current().layout, paneId);
			if (!pane?.covers.length || !allows("collapse")) return;
			dispatch({ type: "ClearCovers", paneId });
		},
	};
}

export type WorkspaceCommands<S> = ReturnType<typeof useWorkspaceCommands<S>>;
