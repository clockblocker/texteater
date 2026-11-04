import {
	type Box,
	isRooted,
	type PaneNode,
	type Presentation,
	restingCards,
	type WritingDirection,
} from "compass";
import { animate } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useEffect,
	useRef,
} from "react";
import { LEAVING, LEAVING_OPACITY } from "@/workspace/motion/motion-spec";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import { type DropReading, destinationAt } from "./destination";
import {
	type Destination,
	type Drag,
	fateOf,
	freshDrag,
	inlineSign,
	isDoubleTap,
	type Lift,
	type NoteHandle,
	pastCommit,
	releaseOf,
	sameDestination,
	sample,
	type ThrowTuning,
} from "./gesture";
import type { DeckInteraction } from "./interaction-policy";
import type { NoteMoves } from "./note-moves";
import { findSheet, type SheetView, sheetsOf } from "./sheets";
import { useBarHold } from "./use-bar-hold";
import type { CompassWorkspace } from "./use-compass-workspace";
import { useDeckSwipe } from "./use-deck-swipe";
import type { GestureState } from "./use-gesture-state";
import { useLift } from "./use-lift";
import { useRelease } from "./use-release";
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
export type PendingLift<S> = Lift & {
	readonly paneId: string;
	readonly make: () => S;
};

/**
 * The drag-and-throw runtime: a press on a Card, a Heading, a Pane bar, a
 * Segment or a Link becomes a Lift, the hand carries the Held Card, the
 * throw and the pointer decide where it goes, and the release sends the
 * reducer the command it showed. The swipe, the hold to lift and the Lifts
 * from a Sheet, a Ground or nowhere (`useLift`) are their own hooks; this
 * one decides between them and everything else.
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
	const { transition, ARM_SLOP, COMMIT, CLICK_SLOP, leanFor } =
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
	/** The last tap on a Card, so a second one soon after is a double-click. */
	const lastTap = useRef<{ id: string; t: number } | null>(null);
	const barHold = useBarHold();
	const release = useRelease({
		workspace,
		gesture,
		moves,
		commands,
		handles,
		direction,
	});
	const { liftSheet, liftGround, liftLoose } = useLift({
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
		afterLooseLift: frameMove,
	});
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

	/**
	 * The Card is in hand from here on: its Deck's three zones read it, or
	 * the drop regions. A Card off a Deck keeps its lean, since it goes on
	 * leaning the way it is carried; anything else is held upright.
	 */
	function takeInHand(d: Drag<S>) {
		const offDeck = !d.lifted && d.deckSheet !== null;
		if (offDeck && d.deckSheet !== null)
			dispatch({
				type: "LiftCard",
				sheetId: d.deckSheet,
				presentationId: d.card.id,
			});
		d.phase = "held";
		if (!offDeck) moves.settleTilt(d.h);
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
			d.phase === "swiping" && pastCommit(d, now, tuning, COMMIT, sign),
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
				/* a throw that drifted off the swipe's axis and stopped
				   there tears loose now: it is no throw any more */
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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
			/* a Card carried off its Deck leans the way it goes; the lean is
			   decoration, so reduced motion holds it upright */
			if (d.phase === "held" && !d.lifted && d.deckSheet !== null)
				h.rotate.set(moves.reduce ? 0 : leanFor(h.x.get()));
		}
		/* past the slop the gesture is one thing or the other, and stays so:
		   toward inline-start off a Deck it swipes the Deck toward its
		   dismiss zone, any other way the Card is in hand */
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

	/**
	 * The pointer `pointerId` (any, if none is given) lets go: whatever
	 * was pending under it is off, and the drag it held, if any, is out of
	 * the hand and returned.
	 */
	function letGo(pointerId?: number): Drag<S> | null {
		pendingLift.current = null;
		pendingHeading.current = null;
		barHold.stop();
		const d = dragRef.current;
		if (!d || (pointerId !== undefined && d.pointerId !== pointerId))
			return null;
		dragRef.current = null;
		/* the release takes the Card from where it is, gap and all */
		d.gap?.stop();
		window.clearTimeout(staleTimer.current);
		return d;
	}

	function frameUp(event: ReactPointerEvent<HTMLElement>) {
		const d = letGo(event.pointerId);
		if (!d) return;
		const { h } = d;
		/* the release reads what the preview read: the commit line and
		   `destinationAt` at this moment, so it does what was shown */
		const what = releaseOf(
			d,
			{ x: h.x.get(), y: h.y.get() },
			event.timeStamp,
			current().layout,
			{ tuning, commit: COMMIT, clickSlop: CLICK_SLOP, sign },
		);
		switch (what.kind) {
			case "in-place":
				release.releaseInPlace(d);
				return;
			case "tap": {
				/* never past the slop, so a tap: the few px it gave go back */
				for (const value of [h.x, h.y]) moves.toRest(value);
				gesture.setDrag(null);
				/* a second tap on the same Card soon after is a double-click:
				   the first brought it to the front, this one expands it. The
				   frame holds the pointer, so the browser's own dblclick goes
				   to the frame, not the Card; the taps are read here */
				const tapped = lastTap.current;
				lastTap.current = { id: d.card.id, t: event.timeStamp };
				if (
					d.deckSheet !== null &&
					isDoubleTap(tapped, d.card.id, event.timeStamp)
				) {
					lastTap.current = null;
					commands.expandCard(d.deckSheet, d.card);
					return;
				}
				if (what.toFront !== null)
					commands.bringToFront(what.toFront, d.card);
				return;
			}
			case "sweep":
				release.sweepByDrag(d);
				return;
			case "snap":
				swipe.snapDeck(d);
				return;
			case "commit":
				release.commitAt(
					d,
					destinationAt$(
						event.clientX,
						event.clientY,
						d,
						event.timeStamp,
					),
				);
		}
	}

	function cancelDrag(event?: ReactPointerEvent<HTMLElement>) {
		const d = letGo(event?.pointerId);
		if (!d) return;
		if (root.current?.hasPointerCapture(d.pointerId))
			root.current.releasePointerCapture(d.pointerId);
		if (d.lifted && d.home !== "slot") {
			release.restore(d);
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
		commitAt: release.commitAt,
		releaseInPlace: release.releaseInPlace,
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
