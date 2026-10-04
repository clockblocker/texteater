import { findPane, restingCards } from "compass";
import {
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useEffect,
	useRef,
} from "react";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import type { DeckInteraction } from "./interaction-policy";
import { findSheet, PREVIEW_PANE, topSheetOf } from "./sheets";
import type { CompassWorkspace } from "./use-compass-workspace";
import type { PagePress } from "./use-drag";

/** A click on one of these is never a dismissive click. */
const DISMISS_EXEMPT_SELECTOR = [
	"button",
	"a",
	"input",
	"textarea",
	"select",
	"option",
	"summary",
	"[contenteditable]",
	"[role=button]",
	"[role=link]",
	"[data-word]",
	/* a Card, resting or held */
	'[data-form="card"]',
	"[data-return-zone]",
	"[data-pane-bar]",
	/* a Cover's Heading is its handle and its ← */
	"[data-heading]",
].join(", ");

/**
 * The Sweep's click and key: a dismissive click on the top Sheet, away
 * from any Link or Segment, or Escape, ends that Sheet's Deck, in either
 * writing direction (tf-demo ADR 0008). A click in the gap beside a
 * Pane's Covers clears them, and Escape mid-drag cancels the gesture.
 */
export function useDismiss<S>({
	root,
	workspace,
	press,
	dragging,
	swallowClick,
	allows,
	sweep,
	clearCovers,
	cancelDrag,
}: {
	root: RefObject<HTMLElement | null>;
	workspace: CompassWorkspace<S>;
	press: RefObject<PagePress | null>;
	/** A gesture is in hand. */
	dragging: () => boolean;
	/** A Lift started under this click: the click is not a click. */
	swallowClick: RefObject<boolean>;
	allows: (interaction: DeckInteraction) => boolean;
	sweep: (sheetId: string) => void;
	clearCovers: (paneId: string) => void;
	cancelDrag: () => void;
}) {
	const { CLICK_SLOP } = useDeckMotion();
	const { current, dispatch } = workspace;
	const dismissOnClick = useRef(false);

	/** Whether a Sheet's Deck has any Card resting on it. */
	function hasCards(sheetId: string): boolean {
		const layout = current().layout;
		const deck = findSheet(layout, sheetId)?.deck;
		return deck ? restingCards(layout, deck).length > 0 : false;
	}

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if (!root.current?.contains(document.activeElement) && !dragging())
				return;
			if (dragging()) {
				cancelDrag();
				return;
			}
			if (!allows("dismiss")) return;
			const { layout, activePaneId } = current();
			const pane = findPane(layout, activePaneId);
			const top = pane ? topSheetOf(pane) : null;
			if (top?.deck && hasCards(top.sheetId)) sweep(top.sheetId);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	function pageMove(event: ReactPointerEvent<HTMLElement>) {
		const pointer = press.current;
		if (!pointer || pointer.id !== event.pointerId) return;
		pointer.moved ||=
			Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >
			CLICK_SLOP;
	}

	/**
	 * A click in the gap between a Pane and its Covers is the top Cover's
	 * ×. The Covers hide everything of the Pane but that gap, so a click
	 * that lands on the Pane or its Ground while it has Covers landed
	 * there. A Card lying over the gap is its own.
	 */
	function clearFromGap(target: HTMLElement): boolean {
		if (target.closest('[data-form="card"], [data-return-zone]'))
			return false;
		const at = target.closest<HTMLElement>(
			'[data-deck-pane], [data-form="ground"]',
		);
		const paneId = at?.dataset.deckPane ?? at?.dataset.pane;
		const pane = paneId ? findPane(current().layout, paneId) : null;
		if (!pane?.covers.length) return false;
		clearCovers(pane.id);
		return true;
	}

	return {
		pageMove,
		/** A press anywhere activates its Pane, and may become a dismissive click. */
		pageDown(event: ReactPointerEvent<HTMLElement>) {
			dismissOnClick.current = false;
			const at = (event.target as HTMLElement).closest<HTMLElement>(
				"[data-deck-pane], [data-pane]",
			);
			const paneId = at?.dataset.deckPane ?? at?.dataset.pane;
			if (paneId && paneId !== PREVIEW_PANE)
				dispatch({ type: "ActivatePane", paneId });
			if (event.button !== 0) return;
			press.current = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				moved: false,
				scrolled: false,
			};
		},
		pageUp(event: ReactPointerEvent<HTMLElement>) {
			const pointer = press.current;
			if (!pointer || pointer.id !== event.pointerId) return;
			pageMove(event);
			dismissOnClick.current =
				!pointer.moved &&
				!pointer.scrolled &&
				window.getSelection()?.isCollapsed !== false;
			press.current = null;
			window.setTimeout(() => {
				dismissOnClick.current = false;
			}, 0);
		},
		/** A press that scrolled something is no click. */
		pageScroll() {
			if (press.current) press.current.scrolled = true;
		},
		pageClick(event: ReactMouseEvent<HTMLElement>) {
			if (swallowClick.current) {
				swallowClick.current = false;
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			if (!dismissOnClick.current) return;
			const target = event.target as HTMLElement;
			if (clearFromGap(target)) return;
			if (!allows("dismiss")) return;
			if (target.closest(DISMISS_EXEMPT_SELECTOR)) return;
			const layout = current().layout;
			const sheetId =
				target.closest<HTMLElement>("[data-sheet-id]")?.dataset.sheetId;
			const paneId =
				target.closest<HTMLElement>("[data-deck-pane]")?.dataset
					.deckPane;
			const pane = paneId ? findPane(layout, paneId) : null;
			const top = pane ? topSheetOf(pane) : null;
			/* only a click on the top Sheet is a click on that Sheet */
			const sheet = sheetId ? findSheet(layout, sheetId) : top;
			if (!sheet?.deck || !hasCards(sheet.sheetId)) return;
			const its = findPane(layout, sheet.paneId);
			if (!its || topSheetOf(its).sheetId !== sheet.sheetId) return;
			sweep(sheet.sheetId);
		},
	};
}
