import {
	type Box,
	cardHeightPx,
	deckHolding,
	findPane,
	type HeldHome,
	handBoxIn,
	heldHome,
	LOOSE_CARD_REM,
	type Presentation,
	restingCards,
} from "compass";
import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useEffect,
	useRef,
} from "react";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import {
	type Destination,
	type Drag,
	freshDrag,
	KEYBOARD_POINTER,
	type Lift,
	type NoteHandle,
} from "./gesture";
import type { DeckInteraction } from "./interaction-policy";
import { remPx } from "./layout";
import type { NoteMoves } from "./note-moves";
import type { SheetView } from "./sheets";
import type { CompassWorkspace } from "./use-compass-workspace";
import type { PagePress, PendingLift } from "./use-drag";
import type { GestureState } from "./use-gesture-state";

/**
 * The Lifts that take a Note into the hand from somewhere other than a
 * Deck: a Sheet by its bar, a Rooted Ground by its held bar, and a fresh
 * Card from a Segment or a Link. `useDrag` decides when; this starts them.
 */
export function useLift<S>({
	root,
	workspace,
	gesture,
	moves,
	handles,
	allows,
	paneBoxes,
	press,
	deckColumnOf,
	swallowClick,
	capture,
	destinationAt$,
	afterLooseLift,
}: {
	root: RefObject<HTMLElement | null>;
	workspace: CompassWorkspace<S>;
	gesture: GestureState<S>;
	moves: NoteMoves;
	handles: RefObject<Map<string, NoteHandle>>;
	allows: (interaction: DeckInteraction) => boolean;
	paneBoxes: Readonly<Record<string, Box>>;
	press: RefObject<PagePress | null>;
	deckColumnOf: (paneId: string) => Box | null;
	/** Set when a Lift starts under a click, so the click is not one. */
	swallowClick: RefObject<boolean>;
	capture: (pointerId: number) => void;
	/** Where letting go at client (`px`, `py`) sends `d`'s Card now. */
	destinationAt$: (
		px: number,
		py: number,
		d: Drag<S>,
		now: number,
	) => Destination | null;
	/** A fresh Card's Lift is finished: the move that started it is read. */
	afterLooseLift: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
	const { OPEN_SCALE } = useDeckMotion();
	const { current, dispatch } = workspace;
	const { dragRef, settlingRef } = gesture;
	/** A fresh Card's Lift, finished once the Card has rendered and has a handle. */
	const queueLift = useRef<{
		card: Presentation<S>;
		lift: Lift;
		box: Box;
		paneId: string;
		event: ReactPointerEvent<HTMLElement>;
	} | null>(null);

	/** The box a Note is held in when it was lifted out of a Sheet or from nowhere. */
	function handBox(lift: Lift, paneId: string, height: number): Box {
		const frameBox = root.current?.getBoundingClientRect();
		if (!frameBox) return { left: 0, top: 0, width: 0, height };
		return handBoxIn(
			frameBox,
			paneBoxes[paneId]?.width ?? frameBox.width,
			lift.x,
			lift.y,
			height,
			remPx(),
			OPEN_SCALE,
		);
	}

	function startLift(
		card: Presentation<S>,
		lift: Lift,
		origin: Box,
		paneId: string,
		deckSheet: string | null,
		home: HeldHome,
		firstDestination: (d: Drag<S>) => Destination | null,
	) {
		const h = handles.current.get(card.id);
		/* nothing to hold: the Lift the reducer began is called off */
		if (!h) {
			dispatch({ type: "CancelGesture" });
			return;
		}
		capture(lift.pointerId);
		press.current = null;
		moves.resetTransforms(h);
		gesture.setPastCommit(false);
		const d = freshDrag<S>({
			card,
			h,
			pointerId: lift.pointerId,
			at: { x: lift.x, y: lift.y, t: performance.now() },
			origin,
			paneId,
			deckSheet,
			home,
			phase: "held",
			lifted: true,
			keyboard: lift.pointerId === KEYBOARD_POINTER,
		});
		gesture.begin(d, firstDestination(d));
	}

	/**
	 * A Sheet is handled by its bar, not by its content: the Card emerges
	 * from the bar (a Cover's Heading, or a Ground's Pane bar) rather than
	 * the whole Sheet shrinking into the hand. The one element stays one
	 * element (ADR 0006); only its box starts the morph at the bar instead
	 * of at the Sheet.
	 */
	function emergeFrom(card: Presentation<S>, bar: HTMLElement | null) {
		const frame = root.current;
		const h = handles.current.get(card.id);
		if (!frame || !h || !bar) return;
		const frameBox = frame.getBoundingClientRect();
		const rect = bar.getBoundingClientRect();
		moves.jumpTo(h, {
			left: rect.left - frameBox.left,
			top: rect.top - frameBox.top,
			width: rect.width,
			height: rect.height,
		});
	}

	/**
	 * A Sheet lifted by its Heading or its Pane bar: a Cover leaves its
	 * stack, a Floating Ground takes its whole Pane with it. If the Card is
	 * still on a live Deck it shrinks toward its slot there; otherwise it
	 * is in hand and a release in its own Pane closes it, as ← would.
	 */
	function liftSheet(
		sheet: SheetView<S>,
		lift: Lift,
		bar: HTMLElement | null,
		firstDestination: (d: Drag<S>) => Destination | null = (d) =>
			destinationAt$(lift.x, lift.y, d, performance.now()),
	) {
		if (!allows("lift") || dragRef.current || settlingRef.current) return;
		const card = sheet.presentation;
		if (!card) return;
		gesture.endReturn();
		const before = current().layout;
		const holder = deckHolding(before, card.id);
		const next = dispatch({ type: "LiftSheet", sheetId: sheet.sheetId });
		if (!next.held) return;
		/* the Deck it lands on is one taller than what it shows now */
		const rem = remPx();
		const height = holder?.deck
			? cardHeightPx(
					restingCards(before, holder.deck).length + 1,
					rem,
					deckColumnOf(holder.paneId)?.height,
				)
			: LOOSE_CARD_REM * rem;
		emergeFrom(card, bar);
		startLift(
			card,
			lift,
			handBox(lift, sheet.paneId, height),
			sheet.paneId,
			holder?.sheetId ?? null,
			heldHome(next) ?? "close",
			firstDestination,
		);
	}

	/** A Rooted Ground's content, its bar held about a second: it lifts and the Pane steps down. */
	function liftGround(
		sheet: SheetView<S>,
		lift: Lift,
		bar: HTMLElement | null,
		firstDestination: (d: Drag<S>) => Destination | null = (d) =>
			destinationAt$(lift.x, lift.y, d, performance.now()),
	) {
		if (!allows("lift") || dragRef.current || settlingRef.current) return;
		const pane = findPane(current().layout, sheet.paneId);
		const card = sheet.presentation;
		if (!pane || !card || pane.covers.length || pane.line.length < 2)
			return;
		gesture.endReturn();
		dispatch({ type: "LiftSheet", sheetId: sheet.sheetId });
		emergeFrom(card, bar);
		startLift(
			card,
			lift,
			handBox(lift, sheet.paneId, LOOSE_CARD_REM * remPx()),
			sheet.paneId,
			null,
			"restore",
			firstDestination,
		);
	}

	/** A Segment or a Link dragged past the slop: a fresh Card, from nowhere. */
	function liftLoose(
		pending: PendingLift<S>,
		event: ReactPointerEvent<HTMLElement>,
	) {
		if (!allows("drag") || dragRef.current || settlingRef.current) return;
		const card = dispatch({
			type: "LiftFresh",
			paneId: pending.paneId,
			subject: pending.make(),
		}).held?.presentation;
		if (!card) return;
		swallowClick.current = true;
		const lift = {
			pointerId: pending.pointerId,
			x: pending.x,
			y: pending.y,
		};
		const box = handBox(lift, pending.paneId, LOOSE_CARD_REM * remPx());
		gesture.setLoose({ card, box });
		/* the handle exists once the Card has rendered; finish the lift then */
		queueLift.current = { card, lift, box, paneId: pending.paneId, event };
	}
	/* an effect, not a layout effect: the Card registers its handle in one */
	useEffect(() => {
		const queued = queueLift.current;
		if (!queued || gesture.loose?.card.id !== queued.card.id) return;
		queueLift.current = null;
		startLift(
			queued.card,
			queued.lift,
			queued.box,
			queued.paneId,
			null,
			"vanish",
			(d) =>
				destinationAt$(
					queued.lift.x,
					queued.lift.y,
					d,
					performance.now(),
				),
		);
		afterLooseLift(queued.event);
	});

	return { liftSheet, liftGround, liftLoose };
}
