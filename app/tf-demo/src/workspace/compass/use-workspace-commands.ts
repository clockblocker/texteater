import {
	type DealtCard,
	deckHolding,
	type Edge,
	findPane,
	groundOf,
	isRooted,
	type PaneNode,
	type Presentation,
	panesOf,
	type Rung,
	restingCards,
	sheetsOf,
} from "react-resizable-panels/workspace";
import { clearSentence } from "./clear-sentence";
import type { DeckInteraction } from "./interaction-policy";
import { findSheet, rungLabel, type SheetView, topSheetOf } from "./sheets";
import type { MenuItem, SubjectRenderer } from "./subject";
import type { CompassWorkspace } from "./use-compass-workspace";

/**
 * The workspace commands a reader's actions send, each told to the log as
 * it is sent. Gestures decide when; these decide what the reducer is told.
 */
export function useWorkspaceCommands<S>({
	workspace,
	renderer,
	menu,
	log,
	allows,
	smooth,
	deckTopOf,
	sweepAway,
}: {
	workspace: CompassWorkspace<S>;
	renderer: SubjectRenderer<S>;
	menu: readonly MenuItem[];
	log: (line: string) => void;
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
	const { label } = renderer;

	/** Logs ← on a Ground, one rung down the line; the rung's Deck leaves with it. */
	function logStepDown(pane: PaneNode<S>, reason: string) {
		const leaving = groundOf(pane);
		const below = pane.line[pane.line.length - 2] as Rung<S>;
		log(
			`${reason}: ${rungLabel(leaving, renderer, menu)} › ${rungLabel(below, renderer, menu)}${leaving.deck ? ", its Deck ends" : ""}`,
		);
	}
	/** ← on a Ground: one rung down the line. The rung's Deck leaves with it. */
	function stepDown(paneId: string, reason: string) {
		const pane = findPane(current().layout, paneId);
		if (!pane || pane.covers.length || pane.line.length < 2) return;
		logStepDown(pane, reason);
		dispatch({ type: "GoBack", sheetId: groundOf(pane).id });
	}
	/** ← on a Cover: Collapse when its Card is still on a live Deck, Close otherwise. */
	function leaveCover(cover: SheetView<S>, reason: string) {
		const card = cover.presentation;
		if (!card) return;
		const holder = deckHolding(current().layout, card.id);
		log(
			`${reason}: ${label(card.subject)} ${holder ? "collapses back to its Card" : "closes"}${cover.deck ? ", its Deck ends" : ""}`,
		);
		dispatch({ type: "GoBack", sheetId: cover.sheetId });
	}
	/** X: a Floating Pane closes with its Covers and its Deck. */
	function closePane(paneId: string, reason: string) {
		const layout = current().layout;
		const pane = findPane(layout, paneId);
		if (!pane || isRooted(pane)) return;
		const ground = groundOf(pane);
		const card = ground.kind === "Sheet" ? ground.presentation : null;
		const holder = card ? deckHolding(layout, card.id) : null;
		log(
			`${reason}: Pane ${paneId} closes${card ? `; ${label(card.subject)} ${holder ? "collapses back to its Card" : "closes"}` : ""}`,
		);
		dispatch({ type: "ClosePane", paneId });
	}
	/** The Deck ends: every Card still on it flies off, then it is gone. */
	function sweep(
		sheetId: string,
		reason: string,
		run?: () => Promise<unknown>,
	) {
		const layout = current().layout;
		const sheet = findSheet(layout, sheetId);
		if (!sheet?.deck) return;
		const cards = restingCards(layout, sheet.deck);
		log(`${reason}: sweep ${cards.length.toString()}`);
		sweepAway(cards, () => dispatch({ type: "Sweep", sheetId }), run);
	}

	return {
		logStepDown,
		sweep,
		/** The Menu's tap: a Menu Item is the Ground's next rung. */
		openMenuItem(paneId: string, item: string) {
			log(
				`Menu › ${menu.find((entry) => entry.key === item)?.label ?? item} in ${paneId}`,
			);
			dispatch({
				type: "StepUp",
				paneId,
				to: { kind: "MenuItem", item },
			});
		},
		/** A Menu Item's selection: it is the Ground's content now. */
		select(paneId: string, subject: S) {
			log(`${label(subject)} in ${paneId}: the Ground's selection`);
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
			const before = findSheet(layout, sheetId)?.deck;
			log(
				`Select "${selection}": ${before ? "replace the Deck, " : ""}deal ${cards.length.toString()}`,
			);
			dispatch({ type: "Deal", sheetId, selection, cards });
		},
		bringToFront(sheetId: string, card: Presentation<S>) {
			if (!allows("select")) return;
			log(`Tap folded: ${label(card.subject)} expands`);
			dispatch({
				type: "BringToFront",
				sheetId,
				presentationId: card.id,
			});
		},
		/** A Link pushes a fresh Presentation as a Cover; Go to source is one. */
		followLink(paneId: string, subject: S, reason: string) {
			log(`${reason}: ${label(subject)} covers ${paneId}`);
			dispatch({ type: "FollowLink", paneId, subject });
		},
		follow(paneId: string, subject: S) {
			if (!allows("follow")) return;
			log(`Follow: ${label(subject)} covers ${paneId}`);
			dispatch({ type: "FollowLink", paneId, subject });
		},
		/** A Cover is a form, not a move: a dealt Card keeps its rank in its Deck. */
		openCover(paneId: string, card: Presentation<S>, reason: string) {
			log(`${reason}: ${label(card.subject)} covers ${paneId}`);
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
			log(`Open: ${label(card.subject)} covers ${sheet.paneId}`);
			dispatch({ type: "Expand", paneId: sheet.paneId });
		},
		/** A Note or a Text dropped on an edge is the new Pane's Ground: a Floating Pane. */
		splitPane(
			card: Presentation<S>,
			paneId: string,
			edge: Edge,
			size: number,
		) {
			const next = dispatch({ type: "Expand", paneId, edge, size });
			const id = panesOf(next.layout).find(
				(pane) => sheetsOf(pane)[0]?.presentation?.id === card.id,
			)?.id;
			log(
				`Drop at ${edge} edge: Floating Pane ${id ?? "?"} with ${label(card.subject)} as Ground`,
			);
		},
		/** The Pane bar's control: the Ground's ←, or a Floating Pane's X. */
		back(paneId: string, reason: string) {
			const pane = findPane(current().layout, paneId);
			if (!pane || !allows("collapse")) return;
			if (isRooted(pane)) {
				if (!pane.covers.length) stepDown(paneId, reason);
			} else closePane(paneId, reason);
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
			leaveCover(top, "←");
		},
		/**
		 * A Cover's ×: every Cover in the Pane leaves at once, each as its ←
		 * would, and the Ground is what remains.
		 */
		clearCovers(paneId: string) {
			const pane = findPane(current().layout, paneId);
			if (!pane?.covers.length || !allows("collapse")) return;
			log(
				`×: ${pane.covers.length > 1 ? `${pane.covers.length.toString()} Covers leave` : "the Cover leaves"} ${paneId}; its Ground shows`,
			);
			dispatch({ type: "ClearCovers", paneId });
		},
	};
}

export type WorkspaceCommands<S> = ReturnType<typeof useWorkspaceCommands<S>>;
