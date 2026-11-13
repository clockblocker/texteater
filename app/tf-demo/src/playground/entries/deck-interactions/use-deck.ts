import { isNarrow } from "compass";
import { animate, type MotionValue, motionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { remPx } from "@/presentation/deck-geometry";
import { DISSOLVE_MS } from "./card-move";
import { createCardMovePlayer } from "./card-move-player";
import { CLOSE_DEFAULTS, type CloseKnobs, coverClose } from "./cover-close";
import { approachRate, type Point, type Rect, type Slot } from "./geometry";
import { coverRect, type Frame } from "./layout";
import {
	type MotionContext,
	SPRINGS,
	type SpringSpec,
	settle,
	transition,
	tweenTo,
	wait,
} from "./motion-kit";
import type { Readouts } from "./readouts";
import { type PullOut, pullOutOf, type Side, tapShuffle } from "./tap-shuffle";

/** One Card's motion values: its box in logical px, its lean and its lift. */
export type CardValues = {
	readonly u: MotionValue<number>;
	readonly v: MotionValue<number>;
	readonly w: MotionValue<number>;
	readonly h: MotionValue<number>;
	/** Logical degrees: mirrored with the inline axis in RTL. */
	readonly r: MotionValue<number>;
	readonly s: MotionValue<number>;
	/** 0 at rest, 1 fully lifted: the shadow follows it. */
	readonly lift: MotionValue<number>;
	/** Only a deal, a reduced exit or a reduced reorder fades a Card; a Card in hand is solid. */
	readonly o: MotionValue<number>;
	/**
	 * 0 while another Card is open over the Deck, else 1: the Card shows at
	 * `o` times this, so hiding it under the Cover never stops a move's own
	 * fade, which would then never finish.
	 */
	readonly veil: MotionValue<number>;
	readonly z: MotionValue<number>;
};

/**
 * A Card's values, born at its slot: set in an effect instead, a value
 * read only through a transform would lose the first change to React's
 * strict-mode effect replay.
 */
function makeValues(slot?: Slot, z = 1): CardValues {
	return {
		u: motionValue(slot?.u ?? 0),
		v: motionValue(slot?.v ?? 0),
		w: motionValue(slot?.w ?? 0),
		h: motionValue(slot?.h ?? 0),
		r: motionValue(slot?.r ?? 0),
		s: motionValue(slot?.s ?? 1),
		lift: motionValue(0),
		o: motionValue(1),
		veil: motionValue(1),
		z: motionValue(z),
	};
}

/** What a glide moves: everything a slot places. */
const GLIDING = ["u", "v", "w", "h", "r", "s", "lift"] as const;

/**
 * Takes `card` to `to` as the reduced path takes a Card across the table:
 * it fades out where it shows, is put there while hidden, and fades in,
 * each half `DISSOLVE_MS` long, as the Deck's player dissolves a close.
 * A close that takes the Card meanwhile stops its fade, and a stopped
 * animation never finishes, so the rest of this never runs.
 */
async function dissolveTo(
	card: CardValues,
	to: Readonly<Record<(typeof GLIDING)[number], number>>,
	context: MotionContext,
) {
	for (const key of GLIDING) card[key].jump(card[key].get());
	const half = { ms: DISSOLVE_MS, ease: [0, 0, 1, 1] as const };
	await animate(card.o, 0, transition(half, context));
	for (const key of GLIDING) card[key].jump(to[key]);
	await animate(card.o, 1, transition(half, context));
}

/** How long the rest of the Deck takes to fade out as a Card opens over it, and back in as it closes. */
const VEIL_MS = 160;
const BASE_Z = 10;
/** A Card a tap or a close lifts off the Deck: above every Card in it, under the hand's. */
const LIFTED_Z = 90;
const HELD_Z = 100;
const COVER_Z = 200;

export type DeckStatus = "dealt" | "leaving" | "gone";

export type Deck = ReturnType<typeof useDeck>;

/** How a tap brings a Card to the front: "off" restacks it at once and lets the reflow take it. */
export type TapShuffle = { readonly pullOut: PullOut; readonly side: Side };

/**
 * The Deck every variant drives: its order, whether it is dealt, gone or
 * has a Card in the Cover, each Card's motion values, and the moves they
 * share. A variant owns only the gesture.
 */
export function useDeck({
	cards,
	frame,
	motion,
	readouts,
	layout,
	deal,
	close = CLOSE_DEFAULTS,
	narrow,
}: {
	/** The Cards dealt, back to front: read once, when the Deck is made. */
	readonly cards: readonly { readonly id: string }[];
	/** Bumped by the inspector's Re-deal. */
	readonly deal: number;
	readonly frame: Frame;
	readonly motion: MotionContext;
	readonly readouts: Readouts;
	readonly layout: (frame: Frame, count: number) => Slot[];
	/** How the Cover's close plays: its defaults unless a variant's knobs say. */
	readonly close?: CloseKnobs;
	/** Whether the Cover fills its Pane, as on a phone; left out, the screen says, as the app reads it. */
	readonly narrow?: boolean;
}) {
	const [initialOrder] = useState(() => cards.map((card) => card.id));
	const [order, setOrder] = useState<readonly string[]>(initialOrder);
	const [status, setStatus] = useState<DeckStatus>("dealt");
	const [expanded, setExpanded] = useState<string | null>(null);
	/** The Card open over the Deck as of now, for a call before the render. */
	const expandedRef = useRef<string | null>(null);
	expandedRef.current = expanded;
	/** The whole Deck's opacity, as one flattened layer: only D's Close deck lowers it. */
	const [opacity] = useState(() => motionValue(1));
	const [values] = useState(() => {
		const first = layout(frame, initialOrder.length);
		return new Map(
			initialOrder.map((id, index) => [
				id,
				makeValues(first[index], BASE_Z + index),
			]),
		);
	});
	/** Cards a gesture is driving, which a re-layout leaves alone. */
	const busy = useRef(new Set<string>());
	/** The Card open in the other Pane, if one is; the ref is it as of now, for a call before the render. */
	const [beside, setBeside] = useState<string | null>(null);
	const besideRef = useRef<string | null>(null);
	const slots = useMemo(
		() => layout(frame, order.length),
		[layout, frame, order.length],
	);
	const motionRef = useRef(motion);
	motionRef.current = motion;
	/* the order a tap reads: a second tap can come before the render */
	const orderRef = useRef(order);
	orderRef.current = order;
	const [player] = useState(() =>
		createCardMovePlayer({
			valuesOf: (id) => values.get(id) ?? makeValues(),
			zOf: (index) => BASE_Z + index,
			liftedZ: LIFTED_Z,
			restZ: (id) => BASE_Z + orderRef.current.indexOf(id),
		}),
	);
	/* a Deck switched away mid-move leaves nothing cued behind it */
	useEffect(() => () => player.clear(), [player]);

	const valuesOf = useCallback(
		(id: string): CardValues => values.get(id) ?? makeValues(),
		[values],
	);
	const slotOf = useCallback(
		(id: string): Slot | undefined => slots[order.indexOf(id)],
		[slots, order],
	);
	/** Whether a gesture, the Cover or the player has `id`: a re-layout leaves it alone. */
	const isBusy = useCallback(
		(id: string) => busy.current.has(id) || player.has(id),
		[player],
	);
	/** `id`'s stacking at rest, in the order as it now stands. */
	const restZ = useCallback(
		(id: string) => BASE_Z + orderRef.current.indexOf(id),
		[],
	);

	const place = useCallback(
		(
			id: string,
			slot: Rect & Partial<Slot>,
			spec: SpringSpec = SPRINGS.settle,
			velocity?: Point,
		) => {
			player.take(id);
			const card = valuesOf(id);
			const context = motionRef.current;
			return Promise.all([
				settle(
					card.u,
					slot.u,
					spec,
					context,
					velocity && velocity.u * 1000,
				),
				settle(
					card.v,
					slot.v,
					spec,
					context,
					velocity && velocity.v * 1000,
				),
				settle(card.w, slot.w, spec, context),
				settle(card.h, slot.h, spec, context),
				settle(card.r, slot.r ?? 0, spec, context),
				settle(card.s, slot.s ?? 1, spec, context),
				settle(card.lift, 0, spec, context),
			]);
		},
		[valuesOf, player],
	);

	/**
	 * Takes `id` to `slot` in a straight line: every value on `spec` from
	 * one shared start, so the box, the scale, the lean and the lift arrive
	 * together and the Card never leaves the line. Of the hand's `velocity`
	 * (px/ms) only the part toward `slot` carries on.
	 */
	const glide = useCallback(
		(
			id: string,
			slot: Rect & Partial<Slot>,
			spec: SpringSpec,
			velocity?: Point,
		) => {
			const card = valuesOf(id);
			const context = motionRef.current;
			/* each value stops where it shows: a spring still driving it,
			   stopped by the next one, would first run on to the moment of
			   the release, a sliver of a frame on along the hand's way, and
			   the line would start there */
			for (const key of GLIDING) card[key].jump(card[key].get());
			const rate = velocity
				? approachRate({ u: card.u.get(), v: card.v.get() }, slot, {
						u: velocity.u * 1000,
						v: velocity.v * 1000,
					})
				: 0;
			const to = {
				...slot,
				r: slot.r ?? 0,
				s: slot.s ?? 1,
				lift: 0,
			};
			/* each value is handed its start explicitly: a spring left to read
			   one would take whatever speed it last measured */
			return Promise.all(
				GLIDING.map((key) =>
					settle(
						card[key],
						to[key],
						spec,
						context,
						(to[key] - card[key].get()) * rate,
					),
				),
			);
		},
		[valuesOf],
	);

	/* every Card no gesture holds rides to its slot */
	useEffect(() => {
		if (frame.w === 0 || status !== "dealt") return;
		order.forEach((id, index) => {
			const slot = slots[index];
			const card = valuesOf(id);
			if (!slot || isBusy(id) || id === expanded) return;
			card.z.set(BASE_Z + index);
			void place(id, slot, SPRINGS.reflow);
		});
	}, [slots, order, status, expanded, frame.w, place, valuesOf, isBusy]);

	/** The hand takes `id`, and with it the Deck: a shuffle or a close ends where every Card shows. */
	const hold = useCallback(
		(id: string) => {
			player.takeAll();
			busy.current.add(id);
			const card = valuesOf(id);
			/* the hand takes the Card from whatever was moving it */
			for (const key of ["u", "v", "r", "o"] as const) card[key].stop();
			card.o.set(1);
			card.z.set(HELD_Z);
		},
		[valuesOf, player],
	);
	const release = useCallback((id: string) => {
		busy.current.delete(id);
	}, []);

	/**
	 * Brings `id` to the front; a Card already there stays as it is. With a
	 * pull-out, the Cards that change places play deck-of-cards' shuffle
	 * from where they show; a Card a hand or the Cover has is left out.
	 * "off" restacks at once and lets the reflow take the Cards there.
	 */
	const bringToFront = useCallback(
		(id: string, tap?: TapShuffle) => {
			const current = orderRef.current;
			if (current.at(-1) === id || !current.includes(id)) return;
			const at = slots[current.indexOf(id)];
			const out =
				tap && at ? pullOutOf(tap.pullOut, tap.side, at.w) : null;
			const plan =
				out === null
					? null
					: tapShuffle({ order: current, id, slots, out });
			const next = plan?.order ?? [
				...current.filter((other) => other !== id),
				id,
			];
			orderRef.current = next;
			if (plan) {
				player.play(
					plan.moves.filter((move) => !busy.current.has(move.id)),
					motionRef.current,
				);
			} else player.takeAll();
			setOrder(next);
		},
		[slots, player],
	);

	/**
	 * The rest of the Deck while a Card is open over it in its own Pane:
	 * every other Card on it fades out as the Card opens and back in as it
	 * closes, so none shows round the Cover. A Card open in the other Pane
	 * is not on the Deck and keeps showing.
	 */
	const veil = useCallback(
		(open: string, to: 0 | 1) => {
			for (const id of orderRef.current)
				if (id !== open && id !== besideRef.current)
					tweenTo(valuesOf(id).veil, to, VEIL_MS, motionRef.current);
		},
		[valuesOf],
	);

	/**
	 * Takes `id` from the other Pane back into its place the way it went:
	 * in one straight line to its slot, shrinking as it travels, on the
	 * spring it opened on. It takes its place in the stacking as it sets
	 * off, beside the Deck, where that shows nowhere, so it slides in
	 * between its neighbours, under the Cards in front of it. Reduced, it
	 * dissolves back, as it dissolved there. Landed on a Deck another Card
	 * is open over, it fades out with the rest of it. It stays busy until
	 * it lands, or the re-layout would take it on its own spring; a hand
	 * that takes it stops the move, which then never finishes, and the
	 * hand's release frees it.
	 */
	const goHome = useCallback(
		(id: string) => {
			const index = orderRef.current.indexOf(id);
			const slot = slots[index];
			if (!slot) {
				busy.current.delete(id);
				return;
			}
			const card = valuesOf(id);
			card.z.set(BASE_Z + index);
			const to = { ...slot, r: slot.r ?? 0, s: slot.s ?? 1, lift: 0 };
			void (
				motionRef.current.reduce
					? dissolveTo(card, to, motionRef.current)
					: glide(id, to, SPRINGS.morph)
			).then(() => {
				busy.current.delete(id);
				if (expandedRef.current)
					tweenTo(card.veil, 0, VEIL_MS, motionRef.current);
			});
		},
		[slots, valuesOf, glide],
	);

	/**
	 * Opens `id` into the Cover in a straight line from where it is: of
	 * the hand's `velocity` only the part headed for the Cover carries on,
	 * so a hand moving any other way never carries the Card off the line
	 * or past the Cover first. With `into`, a Cover's box in another Pane,
	 * it opens there instead, the same way, and a Card already open there
	 * goes home as it comes; reduced, it dissolves into it. A Card open in
	 * the other Pane leaves the Deck as it was, every other Card on it
	 * free to be swiped, tapped and opened. Over the Deck, the rest of it
	 * fades out once `uncovered` has: a swipe's panel, under the Cards in
	 * front of the swiped one, which they would otherwise uncover.
	 */
	const expand = useCallback(
		async (
			id: string,
			velocity?: Point,
			into?: Rect,
			uncovered?: Promise<unknown>,
		) => {
			player.take(id);
			busy.current.add(id);
			const card = valuesOf(id);
			card.z.set(COVER_Z);
			readouts.set({ phase: "expanded" });
			if (into) {
				const was = besideRef.current;
				besideRef.current = id;
				setBeside(id);
				if (was && was !== id) goHome(was);
			} else {
				expandedRef.current = id;
				setExpanded(id);
				if (!uncovered) veil(id, 0);
				else
					void uncovered.then(() => {
						if (expandedRef.current === id) veil(id, 0);
					});
			}
			const box =
				into ??
				coverRect(
					frame,
					narrow ??
						isNarrow(document.documentElement.clientWidth, remPx()),
				);
			const to = { ...box, r: 0, s: 1, lift: 0 };
			if (into && motionRef.current.reduce) {
				await dissolveTo(card, to, motionRef.current);
				return;
			}
			await glide(id, to, SPRINGS.morph, velocity);
		},
		[valuesOf, readouts, glide, frame, player, narrow, goHome, veil],
	);

	/**
	 * Closes `which`, or with none the Cover over the Deck, or else the
	 * Card in the other Pane. The one in the other Pane goes home as
	 * `goHome` takes it. The one over the Deck goes back into its place as
	 * `coverClose` plans it, from wherever it shows, while the rest of the
	 * Deck comes back in: the player has it from here, so its stacking
	 * comes with the plan, in the frame the plan puts it.
	 */
	const closeCover = useCallback(
		(which?: string) => {
			const open = expandedRef.current;
			const id = which ?? open ?? besideRef.current;
			if (!id) return;
			if (id === besideRef.current) {
				besideRef.current = null;
				setBeside(null);
				goHome(id);
				if (!open) readouts.set({ phase: "rest" });
				return;
			}
			if (id !== open) return;
			expandedRef.current = null;
			setExpanded(null);
			veil(id, 1);
			busy.current.delete(id);
			const move = coverClose({
				order: orderRef.current,
				id,
				slots,
				knobs: close,
			});
			if (!move) {
				readouts.set({ phase: "rest" });
				return;
			}
			readouts.set({ phase: "settling" });
			player.play([move], motionRef.current, () =>
				readouts.set({ phase: "rest" }),
			);
		},
		[readouts, slots, close, player, goHome, veil],
	);

	/**
	 * The Deck leaves as `exit` takes it, the variant's own motion; it is
	 * gone once that is done.
	 */
	const leave = useCallback(
		async (exit: () => Promise<unknown>) => {
			player.takeAll();
			setStatus("leaving");
			readouts.set({ phase: "settling" });
			await exit();
			busy.current.clear();
			besideRef.current = null;
			setBeside(null);
			setStatus("gone");
			readouts.set({ phase: "gone", zone: null });
		},
		[readouts, player],
	);

	/** Deals the Deck again, in its first order, rising into place. */
	const redeal = useCallback(() => {
		const context = motionRef.current;
		busy.current.clear();
		player.clear();
		expandedRef.current = null;
		setExpanded(null);
		besideRef.current = null;
		setBeside(null);
		orderRef.current = initialOrder;
		setOrder(initialOrder);
		const fresh = layout(frame, initialOrder.length);
		/* jumps, not sets: the Deck is gone, so nothing visibly teleports,
		   and a set would hand the next spring the jump as velocity */
		opacity.jump(1);
		initialOrder.forEach((id, index) => {
			const card = valuesOf(id);
			const slot = fresh[index];
			if (!slot) return;
			card.u.jump(slot.u);
			card.v.jump(slot.v + 40);
			card.w.jump(slot.w);
			card.h.jump(slot.h);
			card.r.jump(slot.r);
			card.s.jump(slot.s);
			card.lift.jump(0);
			card.o.jump(0);
			card.veil.jump(1);
			card.z.jump(BASE_Z + index);
			void wait(index * 40, context).then(() => {
				if (busy.current.has(id)) return;
				settle(card.v, slot.v, SPRINGS.settle, context);
				tweenTo(card.o, 1, 200, context);
			});
		});
		setStatus("dealt");
		readouts.set({ phase: "rest", zone: null });
	}, [layout, frame, valuesOf, readouts, opacity, initialOrder, player]);

	const dealt = useRef(deal);
	useEffect(() => {
		if (dealt.current === deal) return;
		dealt.current = deal;
		redeal();
	}, [deal, redeal]);

	return {
		frame,
		order,
		status,
		expanded,
		beside,
		slots,
		opacity,
		valuesOf,
		slotOf,
		place,
		hold,
		release,
		isBusy,
		isPlaying: player.has,
		restZ,
		bringToFront,
		expand,
		closeCover,
		leave,
		redeal,
		motion: motionRef,
	};
}
