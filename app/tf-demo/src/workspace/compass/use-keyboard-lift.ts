import type { Presentation, WritingDirection } from "compass";
import { type RefObject, useEffect, useState } from "react";
import { type DropReading, keyboardDestinations } from "./destination";
import {
	type Destination,
	type Drag,
	freshDrag,
	homeLabel,
	KEYBOARD_POINTER,
	type Lift,
	type NoteHandle,
	sameDestination,
} from "./gesture";
import type { DeckInteraction } from "./interaction-policy";
import type { NoteMoves } from "./note-moves";
import type { SheetView } from "./sheets";
import type { SubjectRenderer } from "./subject";
import type { useDrag } from "./use-drag";
import type { GestureState } from "./use-gesture-state";

/**
 * The keyboard's Lift. A Lift handle starts it; the Held Card then stays
 * where it is while the arrow keys walk the destinations a drop could
 * have, in reading order, each previewed as a pointer would preview it.
 * Enter or Space lets go there, and Escape cancels the gesture.
 */
export function useKeyboardLift<S>({
	root,
	gesture,
	drag,
	moves,
	handles,
	renderer,
	allows,
	direction,
	reading,
}: {
	root: RefObject<HTMLElement | null>;
	gesture: GestureState<S>;
	drag: ReturnType<typeof useDrag<S>>;
	moves: NoteMoves;
	handles: RefObject<Map<string, NoteHandle>>;
	renderer: SubjectRenderer<S>;
	allows: (interaction: DeckInteraction) => boolean;
	direction: WritingDirection;
	reading: (card: Presentation<S>) => DropReading<S>;
}) {
	const { dragRef, settlingRef } = gesture;
	/** What a screen reader hears about the keyboard's Lift. */
	const [announcement, setAnnouncement] = useState("");

	function describe(d: Drag<S>, at: Destination | null): string {
		if (!at) return "Nowhere to let go";
		switch (at.kind) {
			case "return":
				return "Back on the Deck";
			case "home":
				return homeLabel(d);
			case "sheet":
				return `Open as a Cover in pane ${at.paneId}`;
			case "pane":
				return `New pane at the ${at.edge === "inline-start" ? "start" : "end"} of pane ${at.paneId}`;
		}
	}
	function first(d: Drag<S>): Destination | null {
		const at = keyboardDestinations(d, reading(d.card))[0] ?? null;
		setAnnouncement(
			`${renderer.label(d.card.subject)} lifted. ${describe(d, at)}. Arrow keys choose where it goes, Enter lets go, Escape cancels.`,
		);
		return at;
	}
	/** Where a keyboard Lift holds a Sheet from: the middle of its handle. */
	function liftFrom(handle: HTMLElement): Lift {
		const box = handle.getBoundingClientRect();
		return {
			pointerId: KEYBOARD_POINTER,
			x: box.left + box.width / 2,
			y: box.top + box.height / 2,
		};
	}
	/** Focus stays in the workspace once what it was on has gone. */
	function keepFocus() {
		requestAnimationFrame(() => {
			if (!root.current?.contains(document.activeElement))
				root.current?.focus({ preventScroll: true });
		});
	}

	useEffect(() => {
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
		const onKey = (event: KeyboardEvent) => {
			const d = dragRef.current;
			if (!d?.keyboard) return;
			const step =
				event.key === "ArrowDown"
					? 1
					: event.key === "ArrowUp"
						? -1
						: event.key === "ArrowRight"
							? direction === "rtl"
								? -1
								: 1
							: event.key === "ArrowLeft"
								? direction === "rtl"
									? 1
									: -1
								: 0;
			const lets = event.key === "Enter" || event.key === " ";
			if (!step && !lets && event.key !== "Escape") return;
			event.preventDefault();
			event.stopPropagation();
			if (event.key === "Escape") {
				drag.cancelDrag();
				setAnnouncement("Lift cancelled");
				keepFocus();
				return;
			}
			const at = gesture.destinationRef.current;
			if (lets) {
				dragRef.current = null;
				if (at?.kind === "home") drag.releaseInPlace(d);
				else drag.commitAt(d, at);
				setAnnouncement(describe(d, at));
				keepFocus();
				return;
			}
			const list = keyboardDestinations(d, reading(d.card));
			if (!list.length) return;
			const here = list.findIndex((candidate) =>
				sameDestination(candidate, at),
			);
			const next =
				list[(Math.max(0, here) + step + list.length) % list.length] ??
				null;
			gesture.setDestination(next);
			setAnnouncement(describe(d, next));
		};
		window.addEventListener("keydown", onKey, { capture: true });
		return () =>
			window.removeEventListener("keydown", onKey, { capture: true });
	});

	return {
		announcement,
		/** A resting Card into the hand from its Deck. */
		liftCard(card: Presentation<S>, sheet: SheetView<S>) {
			if (!allows("drag") || dragRef.current || settlingRef.current)
				return;
			const h = handles.current.get(card.id);
			if (!h) return;
			gesture.endReturn();
			moves.resetTransforms(h);
			const d = freshDrag<S>({
				card,
				h,
				pointerId: KEYBOARD_POINTER,
				at: { x: 0, y: 0, t: performance.now() },
				origin: moves.boxOf(h),
				paneId: sheet.paneId,
				deckSheet: sheet.sheetId,
				home: "slot",
				phase: "pressed",
				lifted: false,
				keyboard: true,
			});
			gesture.begin(d, null);
			drag.takeInHand(d);
			gesture.setDestination(first(d));
		},
		/** A Cover, or a Floating Ground, by its handle. */
		liftSheet(sheet: SheetView<S>, handle: HTMLElement) {
			drag.liftSheet(sheet, liftFrom(handle), handle, first);
		},
		/** A Rooted Ground, by its Pane bar: no hold, the key is the decision. */
		liftGround(sheet: SheetView<S>, handle: HTMLElement) {
			drag.liftGround(sheet, liftFrom(handle), handle, first);
		},
	};
}
