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
import { DUMMY_DECK } from "./words";

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
	/** Only a deal or a reduced exit fades a Card; a Card in hand is solid. */
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
const INITIAL_ORDER = DUMMY_DECK.map((card) => card.id);

export type DeckStatus = "dealt" | "leaving" | "gone";

export type Deck = ReturnType<typeof useDeck>;

/**
 * The Deck every variant drives: its order, whether it is dealt, gone or
 * has a Card in the Cover, each Card's motion values, and the moves they
 * share. A variant owns only the gesture.
 */
export function useDeck({
	frame,
	motion,
	readouts,
	layout,
	deal,
}: {
	/** Bumped by the inspector's Re-deal. */
	readonly deal: number;
	readonly frame: Frame;
	readonly motion: MotionContext;
	readonly readouts: Readouts;
	readonly layout: (frame: Frame, count: number) => Slot[];
}) {
	const [order, setOrder] = useState<readonly string[]>(INITIAL_ORDER);
	const [status, setStatus] = useState<DeckStatus>("dealt");
	const [expanded, setExpanded] = useState<string | null>(null);
	const [marks, setMarks] = useState<Readonly<Record<string, Mark | null>>>(
		{},
	);
	const [values] = useState(() => {
		const first = layout(frame, INITIAL_ORDER.length);
		return new Map(
			INITIAL_ORDER.map((id, index) => [
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

	const valuesOf = useCallback(
		(id: string): CardValues => values.get(id) ?? makeValues(),
		[values],
	);
	const slotOf = useCallback(
		(id: string): Slot | undefined => slots[order.indexOf(id)],
		[slots, order],
	);

	const place = useCallback(
		(
			id: string,
			slot: Rect & Partial<Slot>,
			spec: SpringSpec = SPRINGS.settle,
			velocity?: Point,
		) => {
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
		[valuesOf],
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
			if (!slot || busy.current.has(id) || id === expanded) return;
			card.z.set(BASE_Z + index);
			void place(id, slot, SPRINGS.reflow);
		});
	}, [slots, order, status, expanded, frame.w, place, valuesOf]);

	const hold = useCallback(
		(id: string) => {
			busy.current.add(id);
			const card = valuesOf(id);
			/* the hand takes the Card from whatever was moving it */
			for (const key of ["u", "v", "r", "o"] as const) card[key].stop();
			card.o.set(1);
			card.z.set(HELD_Z);
		},
		[valuesOf],
	);
	const release = useCallback((id: string) => {
		busy.current.delete(id);
	}, []);
	const isBusy = useCallback((id: string) => busy.current.has(id), []);

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

	const bringToFront = useCallback((id: string) => {
		setOrder((current) => [...current.filter((other) => other !== id), id]);
	}, []);

	/**
	 * Opens `id` into the Cover. By default each axis keeps the hand's
	 * `velocity`; on the `"straight"` path the Card goes there in a line,
	 * keeping only the part of it headed for the Cover.
	 */
	const expand = useCallback(
		async (
			id: string,
			velocity?: Point,
			path: "carry" | "straight" = "carry",
		) => {
			clearMark(id);
			busy.current.add(id);
			valuesOf(id).z.set(COVER_Z);
			setExpanded(id);
			readouts.set({ phase: "expanded" });
			const move = path === "straight" ? glide : place;
			await move(
				id,
				{ ...coverRect(frame), r: 0, s: 1 },
				SPRINGS.morph,
				velocity,
			);
		},
		[clearMark, valuesOf, readouts, place, glide, frame],
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
	 * The Deck leaves along `direction` (logical, unit length): the lead
	 * Card first with the hand's velocity, the rest after it `stagger` ms
	 * apart, each keeping its own speed, or, `together`, folded under the
	 * lead, with the lead's. A reduced exit moves 24 px while it fades.
	 */
	const dismiss = useCallback(
		async ({
			direction,
			lead,
			stagger,
			spec = SPRINGS.fly,
			velocity,
			together = false,
		}: {
			readonly direction: Point;
			readonly lead: string | null;
			readonly stagger: number;
			readonly spec?: SpringSpec;
			readonly velocity?: Point;
			readonly together?: boolean;
		}) => {
			setStatus("leaving");
			readouts.set({ phase: "settling" });
			const context = motionRef.current;
			const rest = [...order].reverse().filter((id) => id !== lead);
			const leaving = lead ? [lead, ...rest] : rest;
			const reach = context.reduce
				? {
						u: direction.u * REDUCED_EXIT_PX,
						v: direction.v * REDUCED_EXIT_PX,
					}
				: exitOffset(frame, direction);
			await Promise.all(
				leaving.map(async (id, index) => {
					const card = valuesOf(id);
					clearMark(id);
					/* a Card not held back starts at once: a timer of 0 would
					   start each a task apart, after the render, and Cards
					   leaving together would part by its length */
					if (index * stagger > 0)
						await wait(index * stagger, context);
					const to = {
						u: card.u.get() + reach.u,
						v: card.v.get() + reach.v,
					};
					const own = together || id === lead ? velocity : undefined;
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
			);
			busy.current.clear();
			setStatus("gone");
			readouts.set({ phase: "gone", zone: null });
		},
		[order, frame, valuesOf, clearMark, readouts],
	);

	/** Deals the Deck again, in its first order, rising into place. */
	const redeal = useCallback(() => {
		const context = motionRef.current;
		busy.current.clear();
		setExpanded(null);
		setOrder(INITIAL_ORDER);
		setMarks({});
		const fresh = layout(frame, INITIAL_ORDER.length);
		/* jumps, not sets: the Deck is gone, so nothing visibly teleports,
		   and a set would hand the next spring the jump as velocity */
		INITIAL_ORDER.forEach((id, index) => {
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
	}, [layout, frame, valuesOf, readouts]);

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
		marks,
		slots,
		valuesOf,
		slotOf,
		place,
		hold,
		release,
		isBusy,
		mark,
		clearMark,
		putBack,
		bringToFront,
		expand,
		closeCover,
		dismiss,
		redeal,
		motion: motionRef,
	};
}
