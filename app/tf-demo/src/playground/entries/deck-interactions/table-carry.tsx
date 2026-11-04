import {
	type AnimationPlaybackControls,
	animate,
	motionValue,
} from "motion/react";
import { useMemo, useRef, useState } from "react";
import { decideTable, nearestTarget, type Target } from "./decide";
import {
	arcPoint,
	centre,
	clamp,
	FOOTPRINT_PAD_PX,
	inflate,
	type Point,
	type Rect,
	type Slot,
	union,
	unit,
} from "./geometry";
import type { TargetKnobs } from "./knobs";
import { type Frame, pileSlots, tableTargets } from "./layout";
import {
	follow,
	type MotionContext,
	SPRINGS,
	settle,
	transition,
} from "./motion-kit";
import type { Drag } from "./pointer";
import type { Readouts } from "./readouts";
import { TargetsView } from "./targets";
import type { Deck, Mark } from "./use-deck";

const LIFT_SCALE = 1.05;
const TILT_GAIN = 5;
const TILT_MAX = 10;
const ARC_TWEEN = { ms: 260 };

const MARKS: Record<Target, Mark> = {
	slot: { label: "Back", tone: "back", edge: "bottom" },
	tray: { label: "Close", tone: "dismiss", edge: "start" },
	pad: { label: "Open", tone: "expand", edge: "end" },
};

type CarryKnobs = TargetKnobs & { readonly flickSpeed: number };

/**
 * B's carry, which E's hold-carry shares: the Card lifts and trails the
 * hand on a stiff spring, the rest of the Deck closes its gap, and the
 * slot, tray and pad appear. Near a target the Card is pulled toward it;
 * the release picks the place it is over.
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
	readonly knobs: CarryKnobs;
}) {
	const [held, setHeld] = useState<string | null>(null);
	const [active, setActive] = useState<Target | null>(null);
	const [pulse, setPulse] = useState(0);
	/** The Deck is sliding into the tray, which stays shown meanwhile. */
	const [landing, setLanding] = useState(false);
	const [slotRect, setSlotRect] = useState<Rect | null>(null);
	const arc = useRef<AnimationPlaybackControls | null>(null);
	const activeRef = useRef<Target | null>(null);
	/** The slot left behind, for the gesture's closures; the state draws it. */
	const slotRef = useRef<Rect | null>(null);
	/** Where in the Card the hand holds it: targets are hit by the hand. */
	const grabRef = useRef<Point>({ u: 0, v: 0 });
	const targets = useMemo(
		() => tableTargets(frame, knobs.targetSize),
		[frame, knobs.targetSize],
	);

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

	function reopen(id: string) {
		for (const other of deck.order) {
			const slot = deck.slotOf(other);
			if (other !== id && slot)
				void deck.place(other, slot, SPRINGS.reflow);
		}
	}

	function pickUp(id: string, grab: Point) {
		arc.current?.stop();
		grabRef.current = grab;
		const card = deck.valuesOf(id);
		const slot = deck.slotOf(id);
		deck.hold(id);
		setHeld(id);
		slotRef.current = slot ?? null;
		setSlotRect(slot ?? null);
		follow(card.s, (slot?.s ?? 1) * LIFT_SCALE, SPRINGS.settle, motion);
		follow(card.r, 0, SPRINGS.tilt, motion);
		follow(card.lift, 1, SPRINGS.settle, motion);
		for (const [other, closed] of closedSlots(id))
			void deck.place(other, closed, SPRINGS.reflow);
		readouts.set({ phase: "carrying" });
	}

	function setTarget(id: string, target: Target | null) {
		activeRef.current = target;
		setActive(target);
		const card = deck.valuesOf(id);
		deck.mark(id, target ? MARKS[target] : null);
		follow(card.stamp, target ? 1 : 0, SPRINGS.settle, motion);
		follow(
			card.glow,
			target && target !== "slot" ? 1 : 0,
			SPRINGS.settle,
			motion,
		);
	}

	/** Moves the Card toward where the hand puts its top-left corner. */
	function carry(id: string, hand: Point, drag: Drag) {
		const card = deck.valuesOf(id);
		const box = { u: hand.u, v: hand.v, w: card.w.get(), h: card.h.get() };
		const middle = centre(box);
		const all = {
			slot: slotRef.current ?? box,
			tray: targets.tray,
			pad: targets.pad,
		};
		const near = nearestTarget(
			all,
			middle,
			knobs.magnetRadius,
			activeRef.current,
		);
		const pull = near ? knobs.magnetStrength : 0;
		const goal =
			near === "tray"
				? targetCentre(targets.tray, middle)
				: near
					? centre(all[near])
					: middle;
		const to = {
			u: hand.u + (goal.u - middle.u) * pull,
			v: hand.v + (goal.v - middle.v) * pull,
		};
		if (near !== activeRef.current) setTarget(id, near);
		const spring = { stiffness: knobs.followStiffness, damping: 60 };
		if (motion.reduce) {
			card.u.set(to.u);
			card.v.set(to.v);
		} else {
			follow(card.u, to.u, spring, motion);
			follow(card.v, to.v, spring, motion);
		}
		const tilt = motion.reduce
			? 0
			: clamp(drag.vu * TILT_GAIN, -TILT_MAX, TILT_MAX);
		follow(card.r, tilt, SPRINGS.tilt, motion);
		readouts.set({
			zone: near ?? "nothing",
			velocity: { x: drag.vx, y: drag.vy },
			tilt: rtl ? -tilt : tilt,
			projected: {
				u: middle.u + drag.vu * 99,
				v: middle.v + drag.vy * 99,
			},
		});
	}

	async function returnHome(id: string) {
		const card = deck.valuesOf(id);
		const slot = deck.slotOf(id);
		if (!slot || motion.reduce) return deck.putBack(id);
		const from = { u: card.u.get(), v: card.v.get() };
		settle(card.r, slot.r, SPRINGS.settle, motion);
		settle(card.s, slot.s, SPRINGS.settle, motion);
		settle(card.lift, 0, SPRINGS.settle, motion);
		const t = motionValue(0);
		t.on("change", (latest) => {
			const point = arcPoint(from, slot, knobs.arcHeight, latest);
			card.u.set(point.u);
			card.v.set(point.v);
		});
		const controls = animate(t, 1, transition(ARC_TWEEN, motion));
		arc.current = controls;
		await controls;
		if (arc.current !== controls) return;
		arc.current = null;
		return deck.putBack(id);
	}

	/** Lets go where the hand puts the Card's top-left corner. */
	function drop(id: string, hand: Point, drag: Drag) {
		const card = deck.valuesOf(id);
		const box = { u: hand.u, v: hand.v, w: card.w.get(), h: card.h.get() };
		const slot = deck.slotOf(id);
		const velocity = { u: drag.vu, v: drag.vy };
		const decision = decideTable({
			centre: centre(box),
			point: plus(hand, grabRef.current),
			offset: {
				u: hand.u - (slot?.u ?? hand.u),
				v: hand.v - (slot?.v ?? hand.v),
			},
			velocity,
			footprint: footprint(id),
			targets: {
				slot: slotRef.current ?? box,
				tray: targets.tray,
				pad: targets.pad,
			},
			radius: knobs.magnetRadius,
			flickSpeed: knobs.flickSpeed,
			previous: activeRef.current,
		});
		setTarget(id, null);
		setHeld(null);
		slotRef.current = null;
		setSlotRect(null);
		readouts.set({
			outcome: `${decision.outcome} · ${decision.reason}`,
			zone: null,
			projected: null,
			phase: "settling",
		});
		if (decision.outcome === "dismiss") {
			const toward =
				decision.target === "tray"
					? unit(
							minus(
								targetCentre(targets.tray, centre(box)),
								centre(box),
							),
						)
					: decision.direction;
			setLanding(decision.target === "tray");
			if (decision.target === "tray" && knobs.commitPulse)
				setPulse((value) => value + 1);
			return deck.dismiss({
				direction: toward,
				lead: id,
				stagger: 40,
				velocity,
			});
		}
		reopen(id);
		if (decision.outcome === "expand") return deck.expand(id, velocity);
		return returnHome(id).then(() => readouts.set({ phase: "rest" }));
	}

	function cancel(id: string) {
		setTarget(id, null);
		setHeld(null);
		slotRef.current = null;
		setSlotRect(null);
		reopen(id);
		void deck.putBack(id);
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
				motion={motion}
			/>
		);

	return { held, pickUp, carry, drop, cancel, view };
}

function plus(a: Point, b: Point): Point {
	return { u: a.u + b.u, v: a.v + b.v };
}

function minus(a: Point, b: Point): Point {
	return { u: a.u - b.u, v: a.v - b.v };
}

/** The middle of the tray rect nearest `point`. */
function targetCentre(rects: readonly Rect[], point: Point): Point {
	let best = rects[0] ? centre(rects[0]) : point;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const rect of rects) {
		const middle = centre(rect);
		const distance = Math.hypot(middle.u - point.u, middle.v - point.v);
		if (distance < bestDistance) {
			best = middle;
			bestDistance = distance;
		}
	}
	return best;
}
