import { animate } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { decideTable, type Target } from "./decide";
import {
	centre,
	clamp,
	FOOTPRINT_PAD_PX,
	inflate,
	type Point,
	type Rect,
	type Slot,
	union,
} from "./geometry";
import type { TableKnobs } from "./knobs";
import { type Frame, pileSlots, tableTargets } from "./layout";
import {
	EASE_DRAWER,
	follow,
	type MotionContext,
	SPRINGS,
	settle,
	transition,
	wait,
} from "./motion-kit";
import type { Drag } from "./pointer";
import type { Readouts } from "./readouts";
import {
	boxUnderHand,
	handOverBox,
	hopVelocity,
	type Live,
	liveTarget,
	pulled,
	stripEdge,
	stripExit,
} from "./table-physics";
import { type Pulse, TargetsView } from "./targets";
import type { Deck, Mark } from "./use-deck";

const DOWN: Point = { u: 0, v: 1 };
/** How much of each frame's speed the lean takes in: a light low-pass. */
const TILT_SMOOTHING = 0.5;
const STILL: Point = { u: 0, v: 0 };
const NOTHING: Live = { target: null, anchor: null, closeness: 0, strip: null };

/** The stamp a lit target puts on the Card: only the two that commit. */
function markOf(live: Live): Mark | null {
	if (live.target === "pad")
		return { label: "Open", tone: "expand", edge: "end" };
	if (live.target === "tray")
		return {
			label: "Close",
			tone: "dismiss",
			edge: live.strip ? stripEdge(live.strip) : "start",
		};
	return null;
}

/** One carry: where the Card was grabbed, its home and whether the slot pulls yet. */
type Hold = {
	readonly id: string;
	/** The grabbed spot's offset from the box corner, at `pressScale`. */
	readonly grab: Point;
	readonly pressScale: number;
	readonly size: { readonly w: number; readonly h: number };
	/** Where the hand is when the Card sits in its slot, lifted. */
	readonly home: Point | null;
	armed: boolean;
};

/**
 * B's carry: the Card lifts and trails the hand on a stiff spring, the
 * spot it was grabbed by staying under the hand, and leans with its own
 * speed. The rest of the Deck closes its gap, nearest Card first, and
 * the slot, tray and pad appear. One target lights at a time and draws
 * the hand toward it; the release does what the lit target says.
 */
export function useTableCarry({
	deck,
	frame,
	rtl,
	motion,
	readouts,
	knobs,
}: {
	readonly deck: Deck;
	readonly rtl: boolean;
	readonly frame: Frame;
	readonly motion: MotionContext;
	readonly readouts: Readouts;
	readonly knobs: TableKnobs;
}) {
	const [held, setHeld] = useState<string | null>(null);
	const [active, setActive] = useState<Target | null>(null);
	const [pulse, setPulse] = useState<Pulse>(0);
	/** The Deck is sliding into the tray, which stays shown meanwhile. */
	const [landing, setLanding] = useState(false);
	const [slotRect, setSlotRect] = useState<Rect | null>(null);
	const live = useRef<Live>(NOTHING);
	const hold = useRef<Hold | null>(null);
	/** Bumped by every pick-up and release: a staggered move from an older one is dropped. */
	const epoch = useRef(0);
	const tiltFrame = useRef<number | null>(null);
	const targets = useMemo(
		() => tableTargets(frame, knobs.targetSize),
		[frame, knobs.targetSize],
	);

	const liftedScale = (id: string) =>
		(deck.slotOf(id)?.s ?? 1) * knobs.liftScale;

	/** The Deck without `id`, closed up as a hand reflows. */
	function closedSlots(id: string): Map<string, Slot> {
		const rest = deck.order.filter((other) => other !== id);
		const slots = pileSlots(frame, rest.length);
		return new Map(
			rest.flatMap((other, index) => {
				const slot = slots[index];
				return slot ? [[other, slot] as const] : [];
			}),
		);
	}

	function footprint(id: string): Rect | null {
		const box = union([...closedSlots(id).values()]);
		return box ? inflate(box, FOOTPRINT_PAD_PX) : null;
	}

	/** Moves every other Card to `slotOf`, the ones next to `id` first, `stagger` ms apart. */
	function reflow(
		id: string,
		slotOf: (other: string) => Slot | undefined,
		stagger: number,
	) {
		const at = deck.order.indexOf(id);
		const others = deck.order
			.filter((other) => other !== id)
			.sort(
				(a, b) =>
					Math.abs(deck.order.indexOf(a) - at) -
					Math.abs(deck.order.indexOf(b) - at),
			);
		const mine = epoch.current;
		others.forEach((other, rank) => {
			const slot = slotOf(other);
			if (!slot) return;
			void wait(rank * stagger, motion).then(() => {
				if (epoch.current === mine)
					void deck.place(other, slot, SPRINGS.reflow);
			});
		});
	}

	function stopTilt() {
		if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
		tiltFrame.current = null;
	}

	/**
	 * The lean follows the Card's own inline speed, read frame to frame
	 * and smoothed, so it lags the hand and relaxes when the hand stops.
	 */
	function startTilt(id: string) {
		stopTilt();
		const card = deck.valuesOf(id);
		let last = Number.NaN;
		let speed = 0;
		let before: { readonly t: number; readonly u: number } | null = null;
		const step = (t: number) => {
			const u = card.u.get();
			if (before && t > before.t)
				speed +=
					((u - before.u) / (t - before.t) - speed) * TILT_SMOOTHING;
			before = { t, u };
			const tilt = motion.reduce
				? 0
				: clamp(speed * knobs.tiltGain, -knobs.tiltMax, knobs.tiltMax);
			if (!(Math.abs(tilt - last) < 0.05)) {
				last = tilt;
				follow(card.r, tilt, SPRINGS.tilt, motion);
				readouts.set({ tilt: rtl ? -tilt : tilt });
			}
			tiltFrame.current = requestAnimationFrame(step);
		};
		tiltFrame.current = requestAnimationFrame(step);
	}

	/** Feedback on the press itself: the Card comes part-way up before it is dragged. */
	function press(id: string) {
		const card = deck.valuesOf(id);
		const slot = deck.slotOf(id);
		const lift = knobs.pressLift;
		follow(card.lift, lift, SPRINGS.settle, motion);
		follow(
			card.s,
			(slot?.s ?? 1) * (1 + (knobs.liftScale - 1) * lift),
			SPRINGS.settle,
			motion,
		);
	}

	function unpress(id: string) {
		const card = deck.valuesOf(id);
		settle(card.lift, 0, SPRINGS.settle, motion);
		settle(card.s, deck.slotOf(id)?.s ?? 1, SPRINGS.settle, motion);
	}

	function pickUp(id: string, grab: Point, pressScale: number) {
		epoch.current += 1;
		const card = deck.valuesOf(id);
		const slot = deck.slotOf(id);
		deck.hold(id);
		setHeld(id);
		setSlotRect(slot ?? null);
		const size = { w: card.w.get(), h: card.h.get() };
		const scale = liftedScale(id);
		hold.current = {
			id,
			grab,
			pressScale,
			size,
			home: slot
				? handOverBox({ box: slot, grab, size, pressScale, scale })
				: null,
			armed: false,
		};
		follow(
			card.s,
			scale,
			motion.reduce ? SPRINGS.settle : SPRINGS.pop,
			motion,
		);
		follow(card.lift, 1, SPRINGS.settle, motion);
		const closed = closedSlots(id);
		reflow(id, (other) => closed.get(other), knobs.reflowStaggerMs);
		startTilt(id);
		readouts.set({ phase: "carrying" });
	}

	function light(id: string, next: Live) {
		const was = live.current;
		live.current = next;
		if (was.target === next.target && was.strip === next.strip) return;
		setActive(next.target);
		const card = deck.valuesOf(id);
		const mark = markOf(next);
		deck.mark(id, mark);
		follow(card.stamp, mark ? 1 : 0, SPRINGS.settle, motion);
		follow(card.glow, mark ? 1 : 0, SPRINGS.settle, motion);
	}

	function liveAt(point: Point): Live {
		const current = hold.current;
		return liveTarget({
			point,
			home: current?.home ?? null,
			tray: targets.tray,
			pad: targets.pad,
			radius: knobs.magnetRadius,
			slotReach: knobs.slotReach,
			previous: live.current.target,
			slotArmed: current?.armed ?? false,
		});
	}

	/** Moves the Card toward where the hand puts its top-left corner. */
	function carry(id: string, hand: Point, drag: Drag) {
		const current = hold.current;
		if (!current || current.id !== id) return;
		const card = deck.valuesOf(id);
		const point = plus(hand, current.grab);
		if (
			!current.armed &&
			current.home &&
			distance(point, current.home) > knobs.slotReach
		)
			current.armed = true;
		const now = liveAt(point);
		light(id, now);
		const to = boxUnderHand({
			point: pulled(point, now, knobs.magnetStrength),
			grab: current.grab,
			size: current.size,
			pressScale: current.pressScale,
			/* the live scale, so the grabbed spot stays put while the lift springs */
			scale: card.s.get(),
		});
		if (motion.reduce) {
			card.u.set(to.u);
			card.v.set(to.v);
		} else {
			const spring = {
				stiffness: knobs.followStiffness,
				damping: 2 * Math.sqrt(knobs.followStiffness),
			};
			follow(card.u, to.u, spring, motion);
			follow(card.v, to.v, spring, motion);
		}
		readouts.set({
			zone: now.target ?? "nothing",
			velocity: { x: drag.vx, y: drag.vy },
			projected: {
				u: point.u + drag.vu * 99,
				v: point.v + drag.vy * 99,
			},
		});
	}

	/**
	 * Back to the slot. The springs take the hand's speed, and the block
	 * one gets an upward kick sized to the distance, so a far return arcs
	 * onto the Deck and a near one just settles. Reduced, it is one soft
	 * tween over the true distance.
	 */
	async function returnHome(id: string, velocity: Point) {
		const card = deck.valuesOf(id);
		const slot = deck.slotOf(id);
		if (!slot) return deck.putBack(id);
		if (motion.reduce) {
			const mine = epoch.current;
			const tween = {
				...transition(
					{ ms: knobs.reducedReturnMs, ease: EASE_DRAWER },
					motion,
				),
			};
			settle(card.s, slot.s, SPRINGS.settle, motion);
			settle(card.lift, 0, SPRINGS.settle, motion);
			settle(card.r, slot.r, SPRINGS.settle, motion);
			await Promise.all([
				animate(card.u, slot.u, tween),
				animate(card.v, slot.v, tween),
			]);
			if (epoch.current === mine) await deck.putBack(id);
			return;
		}
		const far = Math.hypot(card.u.get() - slot.u, card.v.get() - slot.v);
		const kick = hopVelocity({
			from: card.v.get(),
			to: slot.v,
			height: Math.min(knobs.arcHeight, far * knobs.hopPerPx),
			stiffness: SPRINGS.settle.stiffness,
			hand: velocity.v * 1000,
		});
		return deck.putBack(id, SPRINGS.settle, {
			u: velocity.u,
			v: kick / 1000,
		});
	}

	function clear(id: string) {
		stopTilt();
		light(id, NOTHING);
		hold.current = null;
		epoch.current += 1;
		setHeld(null);
		setSlotRect(null);
	}

	/** Lets go where the hand puts the Card's top-left corner. */
	function drop(id: string, hand: Point, drag: Drag) {
		const current = hold.current;
		const card = deck.valuesOf(id);
		const point = current ? plus(hand, current.grab) : hand;
		const now = current ? liveAt(point) : NOTHING;
		const slot = deck.slotOf(id);
		const velocity = { u: drag.vu, v: drag.vy };
		const decision = decideTable({
			centre: centre({
				u: card.u.get(),
				v: card.v.get(),
				w: card.w.get(),
				h: card.h.get(),
			}),
			offset: {
				u: hand.u - (slot?.u ?? hand.u),
				v: hand.v - (slot?.v ?? hand.v),
			},
			velocity,
			footprint: footprint(id),
			active: now.target,
			exit: now.strip ? stripExit(now.strip) : DOWN,
			flickSpeed: knobs.flickSpeed,
		});
		clear(id);
		readouts.set({
			outcome: `${decision.outcome} · ${decision.reason}`,
			zone: null,
			projected: null,
			phase: "settling",
		});
		if (decision.target === "tray" && knobs.commitPulse)
			setPulse((was) => was + 1);
		if (decision.outcome === "dismiss") {
			setLanding(decision.target === "tray");
			/* the Card lands in the tray: its shadow drops as it slides */
			settle(card.lift, 0, SPRINGS.settle, motion);
			settle(card.r, 0, SPRINGS.settle, motion);
			return deck.dismiss({
				direction: decision.direction,
				lead: id,
				stagger: 40,
				velocity,
			});
		}
		const slots = new Map(
			deck.order.map((other) => [other, deck.slotOf(other)] as const),
		);
		/* the gap reopens at once: the hand is making room, and the
		   hover fan takes the Deck over as soon as nothing is held */
		reflow(id, (other) => slots.get(other), 0);
		if (decision.outcome === "expand") return deck.expand(id, velocity);
		return returnHome(id, velocity).then(() =>
			readouts.set({ phase: "rest" }),
		);
	}

	function cancel(id: string) {
		clear(id);
		const slots = new Map(
			deck.order.map((other) => [other, deck.slotOf(other)] as const),
		);
		/* the gap reopens at once: the hand is making room, and the
		   hover fan takes the Deck over as soon as nothing is held */
		reflow(id, (other) => slots.get(other), 0);
		void returnHome(id, STILL);
	}

	function shown(target: Target): boolean {
		if (deck.status === "leaving") return target === "tray" && landing;
		if (deck.status !== "dealt" || deck.expanded) return false;
		if (knobs.showTargets === "near") return false;
		if (target === "slot") return held !== null;
		return knobs.showTargets === "always" || held !== null;
	}

	const view =
		deck.status === "gone" ? null : (
			<TargetsView
				targets={targets}
				slot={slotRect}
				shown={shown}
				active={active}
				pulse={pulse}
				staggerMs={knobs.targetStaggerMs}
				motion={motion}
			/>
		);

	return { held, press, unpress, pickUp, carry, drop, cancel, view };
}

function plus(a: Point, b: Point): Point {
	return { u: a.u + b.u, v: a.v + b.v };
}

function distance(a: Point, b: Point): number {
	return Math.hypot(a.u - b.u, a.v - b.v);
}
