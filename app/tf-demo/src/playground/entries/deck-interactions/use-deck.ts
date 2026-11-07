import { type MotionValue, motionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { approachRate, type Point, type Rect, type Slot } from "./geometry";
import { coverRect, exitOffset, type Frame } from "./layout";
import {
	type MotionContext,
	REDUCED_EXIT_MS,
	REDUCED_EXIT_PX,
	SPRINGS,
	type SpringSpec,
	settle,
	tweenTo,
	wait,
} from "./motion-kit";
import type { Readouts } from "./readouts";
import { type PullOut, pullOutOf, type Side, tapShuffle } from "./tap-shuffle";
import { createTapShufflePlayer } from "./tap-shuffle-player";

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
	readonly z: MotionValue<number>;
	readonly stamp: MotionValue<number>;
	readonly glow: MotionValue<number>;
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
		z: motionValue(z),
		stamp: motionValue(0),
		glow: motionValue(0),
	};
}

type MarkTone = "dismiss" | "expand" | "back";
/** The label stamped on a Card in hand, and the edge that glows. */
export type Mark = {
	readonly label: string;
	readonly tone: MarkTone;
	readonly edge: "start" | "end" | "top" | "bottom";
};

/** What a glide moves: everything a slot places. */
const GLIDING = ["u", "v", "w", "h", "r", "s", "lift"] as const;

const BASE_Z = 10;
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
}: {
	/** The Cards dealt, back to front: read once, when the Deck is made. */
	readonly cards: readonly { readonly id: string }[];
	/** Bumped by the inspector's Re-deal. */
	readonly deal: number;
	readonly frame: Frame;
	readonly motion: MotionContext;
	readonly readouts: Readouts;
	readonly layout: (frame: Frame, count: number) => Slot[];
}) {
	const [initialOrder] = useState(() => cards.map((card) => card.id));
	const [order, setOrder] = useState<readonly string[]>(initialOrder);
	const [status, setStatus] = useState<DeckStatus>("dealt");
	const [expanded, setExpanded] = useState<string | null>(null);
	const [marks, setMarks] = useState<Readonly<Record<string, Mark | null>>>(
		{},
	);
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
	const slots = useMemo(
		() => layout(frame, order.length),
		[layout, frame, order.length],
	);
	const motionRef = useRef(motion);
	motionRef.current = motion;
	/* the order a tap reads: a second tap can come before the render */
	const orderRef = useRef(order);
	orderRef.current = order;
	/** Whether a tap's shuffle is still moving Cards: the hover fan waits for it. */
	const [shuffling, setShuffling] = useState(false);
	const [shuffle] = useState(() =>
		createTapShufflePlayer({
			valuesOf: (id) => values.get(id) ?? makeValues(),
			zOf: (index) => BASE_Z + index,
			restZ: (id) => BASE_Z + orderRef.current.indexOf(id),
			onIdle: () => setShuffling(false),
		}),
	);
	/* a Deck switched away mid-shuffle leaves nothing cued behind it */
	useEffect(() => () => shuffle.clear(), [shuffle]);

	const valuesOf = useCallback(
		(id: string): CardValues => values.get(id) ?? makeValues(),
		[values],
	);
	const slotOf = useCallback(
		(id: string): Slot | undefined => slots[order.indexOf(id)],
		[slots, order],
	);
	/** Whether a gesture, the Cover or a tap's shuffle has `id`: a re-layout leaves it alone. */
	const isBusy = useCallback(
		(id: string) => busy.current.has(id) || shuffle.has(id),
		[shuffle],
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
			shuffle.take(id);
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
		[valuesOf, shuffle],
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

	/** The hand takes `id`, and with it the Deck: a shuffle ends where every Card shows. */
	const hold = useCallback(
		(id: string) => {
			shuffle.takeAll();
			busy.current.add(id);
			const card = valuesOf(id);
			/* the hand takes the Card from whatever was moving it */
			for (const key of ["u", "v", "r", "o"] as const) card[key].stop();
			card.o.set(1);
			card.z.set(HELD_Z);
		},
		[valuesOf, shuffle],
	);
	const release = useCallback((id: string) => {
		busy.current.delete(id);
	}, []);

	const mark = useCallback((id: string, next: Mark | null) => {
		setMarks((current) => {
			const was = current[id] ?? null;
			if (
				was?.label === next?.label &&
				was?.tone === next?.tone &&
				was?.edge === next?.edge
			)
				return current;
			return { ...current, [id]: next };
		});
	}, []);

	const clearMark = useCallback(
		(id: string) => {
			const card = valuesOf(id);
			settle(card.stamp, 0, SPRINGS.settle, motionRef.current);
			settle(card.glow, 0, SPRINGS.settle, motionRef.current);
			mark(id, null);
		},
		[valuesOf, mark],
	);

	/** Takes `id` back to its slot and lets the layout have it again. */
	const putBack = useCallback(
		async (
			id: string,
			spec: SpringSpec = SPRINGS.settle,
			velocity?: Point,
		) => {
			const slot = slotOf(id);
			clearMark(id);
			if (slot) await place(id, slot, spec, velocity);
			release(id);
			valuesOf(id).z.set(BASE_Z + order.indexOf(id));
		},
		[slotOf, clearMark, place, release, valuesOf, order],
	);

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
				shuffle.play(
					plan.moves.filter((move) => !busy.current.has(move.id)),
					motionRef.current,
				);
				if (shuffle.size > 0) setShuffling(true);
			} else shuffle.takeAll();
			setOrder(next);
		},
		[slots, shuffle],
	);

	/**
	 * Opens `id` into the Cover in a straight line from where it is: of
	 * the hand's `velocity` only the part headed for the Cover carries on,
	 * so a hand moving any other way never carries the Card off the line
	 * or past the Cover first.
	 */
	const expand = useCallback(
		async (id: string, velocity?: Point) => {
			shuffle.take(id);
			clearMark(id);
			busy.current.add(id);
			valuesOf(id).z.set(COVER_Z);
			setExpanded(id);
			readouts.set({ phase: "expanded" });
			await glide(
				id,
				{ ...coverRect(frame), r: 0, s: 1 },
				SPRINGS.morph,
				velocity,
			);
		},
		[clearMark, valuesOf, readouts, glide, frame, shuffle],
	);

	const closeCover = useCallback(async () => {
		const id = expanded;
		if (!id) return;
		setExpanded(null);
		readouts.set({ phase: "settling" });
		const slot = slotOf(id);
		if (slot) await place(id, slot, SPRINGS.morph);
		busy.current.delete(id);
		valuesOf(id).z.set(BASE_Z + order.indexOf(id));
		readouts.set({ phase: "rest" });
	}, [expanded, readouts, slotOf, place, valuesOf, order]);

	/**
	 * The Deck leaves as `exit` takes it, the variant's own motion; it is
	 * gone once that is done.
	 */
	const leave = useCallback(
		async (exit: () => Promise<unknown>) => {
			shuffle.takeAll();
			setStatus("leaving");
			readouts.set({ phase: "settling" });
			for (const id of order) clearMark(id);
			await exit();
			busy.current.clear();
			setStatus("gone");
			readouts.set({ phase: "gone", zone: null });
		},
		[order, clearMark, readouts, shuffle],
	);

	/**
	 * The Deck leaves along `direction` (logical, unit length): the lead
	 * Card first with the hand's velocity, the rest after it `stagger` ms
	 * apart, each keeping its own speed. A reduced exit moves 24 px while
	 * it fades.
	 */
	const dismiss = useCallback(
		({
			direction,
			lead,
			stagger,
			spec = SPRINGS.fly,
			velocity,
		}: {
			readonly direction: Point;
			readonly lead: string | null;
			readonly stagger: number;
			readonly spec?: SpringSpec;
			readonly velocity?: Point;
		}) => {
			const context = motionRef.current;
			const rest = [...order].reverse().filter((id) => id !== lead);
			const leaving = lead ? [lead, ...rest] : rest;
			const reach = context.reduce
				? {
						u: direction.u * REDUCED_EXIT_PX,
						v: direction.v * REDUCED_EXIT_PX,
					}
				: exitOffset(frame, direction);
			return leave(() =>
				Promise.all(
					leaving.map(async (id, index) => {
						const card = valuesOf(id);
						/* a Card not held back starts at once: a timer of 0
						   would start each a task apart, after the render */
						if (index * stagger > 0)
							await wait(index * stagger, context);
						const to = {
							u: card.u.get() + reach.u,
							v: card.v.get() + reach.v,
						};
						const own = id === lead ? velocity : undefined;
						if (context.reduce) {
							await Promise.all([
								tweenTo(card.u, to.u, REDUCED_EXIT_MS, context),
								tweenTo(card.v, to.v, REDUCED_EXIT_MS, context),
								tweenTo(card.o, 0, REDUCED_EXIT_MS, context),
							]);
							return;
						}
						await Promise.all([
							settle(
								card.u,
								to.u,
								spec,
								context,
								own && own.u * 1000,
							),
							settle(
								card.v,
								to.v,
								spec,
								context,
								own && own.v * 1000,
							),
						]);
					}),
				),
			);
		},
		[order, frame, valuesOf, leave],
	);

	/** Deals the Deck again, in its first order, rising into place. */
	const redeal = useCallback(() => {
		const context = motionRef.current;
		busy.current.clear();
		shuffle.clear();
		setExpanded(null);
		orderRef.current = initialOrder;
		setOrder(initialOrder);
		setMarks({});
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
			card.stamp.jump(0);
			card.glow.jump(0);
			card.o.jump(0);
			card.z.jump(BASE_Z + index);
			void wait(index * 40, context).then(() => {
				if (busy.current.has(id)) return;
				settle(card.v, slot.v, SPRINGS.settle, context);
				tweenTo(card.o, 1, 200, context);
			});
		});
		setStatus("dealt");
		readouts.set({ phase: "rest", zone: null, tilt: 0 });
	}, [layout, frame, valuesOf, readouts, opacity, initialOrder, shuffle]);

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
		shuffling,
		marks,
		slots,
		opacity,
		valuesOf,
		slotOf,
		place,
		hold,
		release,
		isBusy,
		isShuffling: shuffle.has,
		restZ,
		mark,
		clearMark,
		putBack,
		bringToFront,
		expand,
		closeCover,
		dismiss,
		leave,
		redeal,
		motion: motionRef,
	};
}
