import { animate } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useEffect,
	useRef,
} from "react";
import {
	type Box,
	cardHeightPx,
	cardWidthIn,
	deckHolding,
	findPane,
	type HeldHome,
	heldHome,
	isRooted,
	LOOSE_CARD_REM,
	type PaneNode,
	type Presentation,
	restingCards,
	type WritingDirection,
} from "react-resizable-panels/workspace";
import { LEAVING, LEAVING_OPACITY } from "@/workspace/motion/motion-spec";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import { type DropReading, destinationAt } from "./destination";
import {
	type Destination,
	type Drag,
	fateOf,
	freshDrag,
	inlineSign,
	KEYBOARD_POINTER,
	type Lift,
	type NoteHandle,
	projected,
	sameDestination,
	sample,
	type ThrowTuning,
} from "./gesture";
import type { DeckInteraction } from "./interaction-policy";
import { remPx } from "./layout";
import type { NoteMoves } from "./note-moves";
import { findSheet, type SheetView, sheetsOf } from "./sheets";
import { useBarHold } from "./use-bar-hold";
import type { CompassWorkspace } from "./use-compass-workspace";
import { useDeckSwipe } from "./use-deck-swipe";
import type { GestureState } from "./use-gesture-state";
import type { WorkspaceCommands } from "./use-workspace-commands";

/** A press on the page that has not yet decided whether it is a click. */
export type PagePress = {
	id: number;
	x: number;
	y: number;
	moved: boolean;
	scrolled: boolean;
};

/** A Segment or a Link under a pointer that has not moved yet. */
type PendingLift<S> = Lift & {
	readonly paneId: string;
	readonly make: () => S;
};

/**
 * The drag-and-throw runtime: a press on a Card, a Heading, a Pane bar, a
 * Segment or a Link becomes a Lift, the hand carries the Held Card, the
 * throw and the pointer decide where it goes, and the release sends the
 * reducer the command it showed. The swipe and the hold to lift are their
 * own hooks; this one decides between them and everything else.
 */
export function useDrag<S>({
	root,
	workspace,
	gesture,
	moves,
	commands,
	handles,
	allows,
	direction,
	paneBoxes,
	tuning,
	reading,
	press,
	linksDrag,
	deckColumnOf,
}: {
	root: RefObject<HTMLElement | null>;
	workspace: CompassWorkspace<S>;
	gesture: GestureState<S>;
	moves: NoteMoves;
	commands: WorkspaceCommands<S>;
	handles: RefObject<Map<string, NoteHandle>>;
	allows: (interaction: DeckInteraction) => boolean;
	direction: WritingDirection;
	paneBoxes: Readonly<Record<string, Box>>;
	tuning: ThrowTuning;
	/** What a destination is read against, for the Card in hand. */
	reading: (card: Presentation<S>) => DropReading<S>;
	/** The page's press, so a Lift can say its release is no click. */
	press: RefObject<PagePress | null>;
	linksDrag: boolean;
	/** Where a Pane's Deck sits, in frame coordinates. */
	deckColumnOf: (paneId: string) => Box | null;
}) {
	const { transition, ARM_SLOP, COMMIT, CLICK_SLOP, OPEN_SCALE } =
		useDeckMotion();
	const { current, dispatch } = workspace;
	const { dragRef, settlingRef, returningRef } = gesture;
	const sign = inlineSign(direction);
	/** Looks at a still hand again once its throw has gone stale; see `reassess`. */
	const staleTimer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(staleTimer.current), []);
	const pendingLift = useRef<PendingLift<S> | null>(null);
	/** A link in a Cover's Heading under a pointer that has not moved yet. */
	const pendingHeading = useRef<
		| (Lift & {
				readonly sheet: SheetView<S>;
				readonly heading: HTMLElement;
		  })
		| null
	>(null);
	/** A lift started under this click: the click is not a click. */
	const swallowClick = useRef(false);
	/** A fresh Card's Lift, finished once the Card has rendered and has a handle. */
	const queueLift = useRef<{
		card: Presentation<S>;
		lift: Lift;
		box: Box;
		paneId: string;
		event: ReactPointerEvent<HTMLElement>;
	} | null>(null);
	const barHold = useBarHold();
	const swipe = useDeckSwipe({
		moves,
		direction,
		tuning,
		followersOf,
		snapBack: gesture.snapBack,
		takeInHand,
	});

	/** Every other Card on the Deck `d`'s Card rests in, and how many ranks away it is. */
	function followersOf(d: Drag<S>): { h: NoteHandle; distance: number }[] {
		if (d.deckSheet === null) return [];
		const layout = current().layout;
		const deck = findSheet(layout, d.deckSheet)?.deck;
		if (!deck) return [];
		const cards = restingCards(layout, deck);
		const lead = cards.findIndex((card) => card.id === d.card.id);
		return cards.flatMap((card, index) => {
			const h = handles.current.get(card.id);
			return card.id === d.card.id || !h
				? []
				: [{ h, distance: Math.abs(index - lead) }];
		});
	}

	/** Where letting go at client (`px`, `py`) sends `d`'s Card now. */
	function destinationAt$(
		px: number,
		py: number,
		d: Drag<S>,
		now: number,
	): Destination | null {
		const frameBox = root.current?.getBoundingClientRect();
		if (!frameBox) return null;
		return destinationAt(
			px - frameBox.left,
			py - frameBox.top,
			d,
			now,
			gesture.destinationRef.current,
			reading(d.card),
		);
	}

	function capture(pointerId: number) {
		try {
			root.current?.setPointerCapture(pointerId);
		} catch {
			/* a pointer the browser is not tracking; the frame still hears it */
		}
	}

	/** The box a Note is held in when it was lifted out of a Sheet or from nowhere. */
	function handBox(lift: Lift, paneId: string, height: number): Box {
		const frameBox = root.current?.getBoundingClientRect();
		if (!frameBox) return { left: 0, top: 0, width: 0, height };
		const width = cardWidthIn(
			paneBoxes[paneId]?.width ?? frameBox.width,
			remPx(),
			OPEN_SCALE,
		);
		return {
			left: Math.max(
				0,
				Math.min(
					frameBox.width - width,
					lift.x - frameBox.left - width / 2,
				),
			),
			top: lift.y - frameBox.top - 24,
			width,
			height,
		};
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
		frameMove(queued.event);
	});

	/** The Card is in hand from here on: the drop regions read it. */
	function takeInHand(d: Drag<S>) {
		if (!d.lifted && d.deckSheet !== null)
			dispatch({
				type: "LiftCard",
				sheetId: d.deckSheet,
				presentationId: d.card.id,
			});
		d.phase = "held";
		moves.settleTilt(d.h);
		gesture.setDrag({ ...d });
	}

	/**
	 * What letting go now would do, shown before it is done: the commit
	 * line of a swipe, and where a Card in hand would land. The release
	 * reads the same two things, so it does what is shown.
	 */
	function reassess(d: Drag<S>, px: number, py: number, now: number) {
		window.clearTimeout(staleTimer.current);
		gesture.setPastCommit(
			d.phase === "swiping" &&
				sign * projected(d, now, tuning).dx < -COMMIT,
		);
		const next = d.phase === "held" ? destinationAt$(px, py, d, now) : null;
		gesture.setDestination((was) =>
			sameDestination(was, next) ? was : next,
		);
		/* a hand that stops has no throw left in it: once its speed has
		   gone stale, look again without it */
		if (now - d.last.t <= tuning.staleMs)
			staleTimer.current = window.setTimeout(() => {
				if (dragRef.current !== d) return;
				const later = performance.now();
				/* a swipe held still past the let-go line is a slow one */
				if (d.phase === "swiping")
					swipe.swipeDeck(
						d,
						d.last.x - d.start.x,
						d.last.y - d.start.y,
						later,
					);
				reassess(d, d.last.x, d.last.y, later);
			}, tuning.staleMs + 1);
	}

	function frameMove(event: ReactPointerEvent<HTMLElement>) {
		const fromLink = pendingHeading.current;
		if (fromLink && fromLink.pointerId === event.pointerId) {
			if (
				Math.hypot(
					event.clientX - fromLink.x,
					event.clientY - fromLink.y,
				) <= ARM_SLOP
			)
				return;
			pendingHeading.current = null;
			/* the link under the press is not followed */
			swallowClick.current = true;
			liftSheet(
				fromLink.sheet,
				{
					pointerId: fromLink.pointerId,
					x: fromLink.x,
					y: fromLink.y,
				},
				fromLink.heading,
			);
		}
		if (!allows("drag")) return;
		const pending = pendingLift.current;
		if (pending && pending.pointerId === event.pointerId) {
			if (
				Math.hypot(
					event.clientX - pending.x,
					event.clientY - pending.y,
				) > ARM_SLOP
			) {
				pendingLift.current = null;
				liftLoose(pending, event);
			}
			return;
		}
		const d = dragRef.current;
		if (!d || d.pointerId !== event.pointerId) return;
		const { h } = d;
		const dx = event.clientX - d.start.x;
		const dy = event.clientY - d.start.y;
		sample(d, event.clientX, event.clientY, event.timeStamp, tuning);
		/* a swiped Card is placed by the swipe, on its rubber band */
		if (d.phase !== "swiping") {
			h.x.set(dx + (d.gap?.x.get() ?? 0));
			h.y.set(dy + (d.gap?.y.get() ?? 0));
		}
		/* past the slop the gesture is one thing or the other, and stays so:
		   toward inline-start off a Deck it swipes the Deck, any other way
		   the Card is in hand */
		if (d.phase === "pressed" && Math.hypot(dx, dy) > ARM_SLOP) {
			if (
				swipe.startsSwipe(dx, dy) &&
				allows("sweep") &&
				d.deckSheet !== null
			) {
				d.phase = "swiping";
				gesture.setDrag({ ...d });
			} else takeInHand(d);
		}
		if (d.phase === "swiping") swipe.swipeDeck(d, dx, dy, event.timeStamp);
		reassess(d, event.clientX, event.clientY, event.timeStamp);
	}

	/* --- letting go --- */

	/** A loose Card let go with nothing under it: it fades where it is. */
	function vanish(d: Drag<S>) {
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
	/** A lifted Cover with no Deck to go back to: it closes, as ← would. */
	function close(d: Drag<S>) {
		dispatch({ type: "Release" });
		gesture.settle(
			() => moves.fade(d.h),
			() => {},
		);
	}
	/** A release with nothing under it, or in the Card's own Pane. */
	function goHome(d: Drag<S>) {
		if (d.home === "slot") {
			dispatch({ type: "Release" });
			gesture.snapBack(d.h);
		} else if (d.home === "restore") restore(d);
		else if (d.home === "close") close(d);
		else vanish(d);
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
	/** Let go over `target`: do what the preview showed. */
	function commitAt(d: Drag<S>, target: Destination | null) {
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
	}
	/**
	 * Let go of a Sheet that never left its bar's slop: a tap on a bar is
	 * not a close, so a Sheet that would close stays a Sheet.
	 */
	function releaseInPlace(d: Drag<S>) {
		if (d.home === "close") restore(d);
		else goHome(d);
	}

	function frameUp(event: ReactPointerEvent<HTMLElement>) {
		pendingLift.current = null;
		pendingHeading.current = null;
		barHold.stop();
		const d = dragRef.current;
		if (!d || d.pointerId !== event.pointerId) return;
		dragRef.current = null;
		/* the release takes the Card from where it is, gap and all */
		d.gap?.stop();
		window.clearTimeout(staleTimer.current);
		const { h } = d;

		if (d.lifted && Math.hypot(h.x.get(), h.y.get()) < CLICK_SLOP + 2) {
			releaseInPlace(d);
			return;
		}
		if (d.phase === "pressed") {
			/* never past the slop, so a tap: the few px it gave go back */
			for (const value of [h.x, h.y]) moves.toRest(value);
			gesture.setDrag(null);
			const layout = current().layout;
			const sheet =
				d.deckSheet === null ? null : findSheet(layout, d.deckSheet);
			if (!sheet?.deck) return;
			const cards = restingCards(layout, sheet.deck);
			const front =
				cards.find((card) => card.id === sheet.deck?.frontId) ??
				cards[0];
			if (front?.id !== d.card.id)
				commands.bringToFront(sheet.sheetId, d.card);
			return;
		}
		/* the release reads what the preview read: `projected` and
		   `destinationAt` at this moment, so it does what was shown */
		if (d.phase === "swiping") {
			if (sign * projected(d, event.timeStamp, tuning).dx < -COMMIT)
				sweepByDrag(d);
			else swipe.snapDeck(d);
			return;
		}
		commitAt(
			d,
			destinationAt$(event.clientX, event.clientY, d, event.timeStamp),
		);
	}

	function cancelDrag(event?: ReactPointerEvent<HTMLElement>) {
		pendingLift.current = null;
		pendingHeading.current = null;
		barHold.stop();
		const d = dragRef.current;
		if (!d || (event && event.pointerId !== d.pointerId)) return;
		dragRef.current = null;
		d.gap?.stop();
		window.clearTimeout(staleTimer.current);
		if (root.current?.hasPointerCapture(d.pointerId))
			root.current.releasePointerCapture(d.pointerId);
		if (d.lifted && d.home !== "slot") {
			restore(d);
			return;
		}
		const lifted = current().held !== null;
		dispatch({ type: "CancelGesture" });
		if (d.lifted && lifted) {
			moves.resetTransforms(d.h);
			gesture.tearDown();
		} else if (d.phase === "swiping") swipe.snapDeck(d);
		else gesture.snapBack(d.h);
	}

	/* a Card that would leave dims, so the loss shows before it happens */
	const leaving =
		gesture.drag?.phase === "held" &&
		fateOf(gesture.drag, gesture.destination) === "leave";
	useEffect(() => {
		const d = dragRef.current;
		if (d?.phase !== "held") return;
		const controls = animate(
			d.h.opacity,
			leaving ? LEAVING_OPACITY : 1,
			transition(LEAVING),
		);
		return () => controls.stop();
	}, [leaving, transition, dragRef]);

	return {
		swallowClick,
		barHolding: barHold.holding,
		frameMove,
		frameUp,
		cancelDrag,
		/** Start a keyboard Lift of `sheet`, held from `at`: see `useKeyboardLift`. */
		liftSheet,
		liftGround,
		takeInHand,
		commitAt,
		releaseInPlace,
		/** A Card on the Deck goes under the pointer; nothing moves until it does. */
		cardDown(
			event: ReactPointerEvent<HTMLElement>,
			card: Presentation<S>,
			sheet: SheetView<S>,
		) {
			if (!allows("drag") && !allows("select")) return;
			if (
				event.button !== 0 ||
				dragRef.current ||
				(settlingRef.current && !returningRef.current)
			)
				return;
			const h = handles.current.get(card.id);
			if (!h) return;
			event.preventDefault();
			capture(event.pointerId);
			gesture.endReturn();
			moves.resetTransforms(h);
			gesture.setPastCommit(false);
			gesture.begin(
				freshDrag<S>({
					card,
					h,
					pointerId: event.pointerId,
					at: {
						x: event.clientX,
						y: event.clientY,
						t: event.timeStamp,
					},
					origin: moves.boxOf(h),
					paneId: sheet.paneId,
					deckSheet: sheet.sheetId,
					home: "slot",
					phase: "pressed",
					lifted: false,
					keyboard: false,
				}),
				null,
			);
		},
		/**
		 * The Pane bar is the Ground's handle. Rooted: hold it about a
		 * second and the Ground lifts. Floating: a plain drag lifts it, like
		 * any Card. Covered, it is nobody's handle.
		 */
		paneBarDown(event: ReactPointerEvent<HTMLElement>, pane: PaneNode<S>) {
			if (event.button !== 0 || barHold.active() || dragRef.current)
				return;
			const target = event.target as HTMLElement;
			const ground = sheetsOf(pane)[0];
			const bar = event.currentTarget;
			/* a link in a Floating Ground's title reads past the slop, as a
			   Cover's does */
			if (target.closest("[data-heading-title] button")) {
				if (
					ground?.presentation &&
					!isRooted(pane) &&
					!pane.covers.length &&
					allows("lift") &&
					linksDrag
				)
					pendingHeading.current = {
						pointerId: event.pointerId,
						x: event.clientX,
						y: event.clientY,
						sheet: ground,
						heading: bar,
					};
				return;
			}
			if (target.closest("button")) return;
			if (!ground?.presentation || pane.covers.length || !allows("lift"))
				return;
			const lift = {
				pointerId: event.pointerId,
				x: event.clientX,
				y: event.clientY,
			};
			event.preventDefault();
			if (!isRooted(pane)) {
				liftSheet(ground, lift, bar);
				return;
			}
			if (pane.line.length < 2) return;
			barHold.start(pane.id, lift, () => liftGround(ground, lift, bar));
		},
		paneBarMove: barHold.move,
		stopBarHold: barHold.stop,
		/** A Cover's Heading is its bar: it lifts the Cover, straight into the hand. */
		coverHeadingDown(
			event: ReactPointerEvent<HTMLElement>,
			sheet: SheetView<S>,
		) {
			if (event.button !== 0 || dragRef.current) return;
			const target = event.target as HTMLElement;
			const heading = target.closest<HTMLElement>("[data-heading]");
			if (!heading || target.closest("[data-heading-chrome]")) return;
			/* a link in the title waits for the slop: a release inside it is
			   the link's click, a move past it lifts the Cover */
			if (target.closest("[data-heading-title] button")) {
				if (!linksDrag) return;
				pendingHeading.current = {
					pointerId: event.pointerId,
					x: event.clientX,
					y: event.clientY,
					sheet,
					heading,
				};
				return;
			}
			event.preventDefault();
			liftSheet(
				sheet,
				{
					pointerId: event.pointerId,
					x: event.clientX,
					y: event.clientY,
				},
				heading,
			);
		},
		/** A press on a Segment or a Link: past the slop, a fresh Card lifts. */
		segmentDown(
			event: ReactPointerEvent<HTMLElement>,
			paneId: string,
			make: () => S,
		) {
			if (event.button !== 0 || dragRef.current) return;
			pendingLift.current = {
				pointerId: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				paneId,
				make,
			};
		},
	};
}
