import {
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";
import {
	type Decision,
	decideDirectional,
	type Live,
	liveDirectional,
} from "./decide";
import { DeckCards, type VariantProps } from "./deck-cards";
import { centre, clamp, lerp, type Point, type Slot, tiltOf } from "./geometry";
import type { StackKnobs } from "./knobs";
import { footprintOf, pileSlots } from "./layout";
import { follow, SPRINGS, settle } from "./motion-kit";
import { createTapCounter, type Drag, SLOP_PX, trackPointer } from "./pointer";
import { type Deck, type Mark, useDeck } from "./use-deck";

/** A Card leaving the pile reveals the one beneath over this distance. */
const REVEAL_PX = 120;
const LIFT_SCALE = 1.03;
const VELOCITY_TILT_MAX = 6;

/** The stamp and glow for a zone, or none while it is back. */
function markFor(live: Live, offset: Point): Mark | null {
	if (live.zone === "back") return null;
	const inline = Math.abs(offset.u) >= Math.abs(offset.v);
	const edge = inline
		? offset.u < 0
			? "start"
			: "end"
		: offset.v > 0
			? "bottom"
			: "top";
	return live.zone === "dismiss"
		? { label: "Close", tone: "dismiss", edge }
		: { label: "Open", tone: "expand", edge };
}

/** What every directional variant does with a release's decision. */
function commit(
	deck: Deck,
	id: string,
	decision: Decision,
	velocity: Point,
	fly: {
		readonly stagger: number;
		readonly stiffness: number;
		readonly damping: number;
	},
) {
	if (decision.outcome === "dismiss")
		return deck.dismiss({
			direction: decision.direction,
			lead: id,
			stagger: fly.stagger,
			spec: { stiffness: fly.stiffness, damping: fly.damping },
			velocity,
		});
	if (decision.outcome === "expand") return deck.expand(id, velocity);
	return deck.putBack(id, SPRINGS.settle, velocity);
}

/** A tap brings a Card to the front; a second within 350 ms and 10 px expands it. */
export function tapCard(
	deck: Deck,
	taps: ReturnType<typeof createTapCounter>,
	id: string,
	drag: Drag,
) {
	if (taps(id, drag.clientX, drag.clientY) === 2) {
		void deck.expand(id);
		return;
	}
	deck.release(id);
	deck.bringToFront(id);
}

/**
 * A, Stack: the Deck stays put and only the touched Card comes up, leaning
 * as it is carried. Left or down past the threshold, or a flick, sweeps
 * the Deck after it; right or up opens the Card.
 */
export function StackVariant({
	frame,
	rtl,
	motion,
	readouts,
	knobs,
	deal,
}: VariantProps<StackKnobs>) {
	const deck = useDeck({ frame, motion, readouts, deal, layout: pileSlots });
	const [held, setHeld] = useState<string | null>(null);
	const [taps] = useState(() => createTapCounter());
	const live = useRef<Live | null>(null);

	function pickUp(id: string, slot: Slot) {
		const card = deck.valuesOf(id);
		deck.hold(id);
		setHeld(id);
		follow(card.s, slot.s * LIFT_SCALE, SPRINGS.settle, motion);
		follow(card.lift, 1, SPRINGS.settle, motion);
		readouts.set({ phase: "carrying" });
	}

	function reveal(next: string | undefined, progress: number) {
		const slot = next ? deck.slotOf(next) : undefined;
		if (!next || !slot || motion.reduce) return;
		deck.valuesOf(next).s.set(
			slot.s * lerp(1, 1 / knobs.revealScale, progress),
		);
	}

	function carry(
		id: string,
		slot: Slot,
		start: Point,
		drag: Drag,
		hinge: boolean,
		next: string | undefined,
		index: number,
	) {
		const card = deck.valuesOf(id);
		const offset = {
			u: start.u + drag.du - slot.u,
			v: start.v + drag.dy - slot.v,
		};
		card.u.set(slot.u + offset.u);
		card.v.set(slot.v + offset.v);
		const tilt = motion.reduce
			? 0
			: tiltOf({
					dx: offset.u,
					vx: drag.vu,
					perPx: knobs.tiltPerPx,
					max: knobs.tiltMax,
					velocityGain: knobs.velocityTiltGain,
					velocityMax: VELOCITY_TILT_MAX,
					hinge,
				});
		follow(card.r, tilt, SPRINGS.tilt, motion);
		const middle = centre({
			...slot,
			u: slot.u + offset.u,
			v: slot.v + offset.v,
		});
		const now = liveDirectional({
			centre: middle,
			offset,
			footprint: footprintOf(deck.slots, index),
			threshold: knobs.threshold,
			previous: live.current,
		});
		live.current = now;
		reveal(next, Math.min(1, Math.hypot(offset.u, offset.v) / REVEAL_PX));
		const mark = markFor(now, offset);
		deck.mark(id, mark);
		const shown = mark ? now.progress : 0;
		card.stamp.set(knobs.stamp ? clamp((shown - 0.3) / 0.7, 0, 1) : 0);
		card.glow.set(shown);
		readouts.set({
			zone: now.zone === "back" ? `back (${now.reason})` : now.zone,
			velocity: { x: drag.vx, y: drag.vy },
			tilt: (rtl ? -1 : 1) * card.r.get(),
			projected: {
				u: middle.u + drag.vu * 99,
				v: middle.v + drag.vy * 99,
			},
		});
	}

	function drop(
		id: string,
		slot: Slot,
		start: Point,
		drag: Drag,
		next: string | undefined,
		index: number,
	) {
		const offset = {
			u: start.u + drag.du - slot.u,
			v: start.v + drag.dy - slot.v,
		};
		const velocity = { u: drag.vu, v: drag.vy };
		const decision = decideDirectional({
			centre: centre({
				...slot,
				u: slot.u + offset.u,
				v: slot.v + offset.v,
			}),
			offset,
			velocity,
			footprint: footprintOf(deck.slots, index),
			threshold: knobs.threshold,
			flickSpeed: knobs.flickSpeed,
		});
		live.current = null;
		setHeld(null);
		readouts.set({
			outcome: `${decision.outcome} · ${decision.reason}`,
			zone: null,
			projected: null,
			phase: "settling",
		});
		const nextSlot = next ? deck.slotOf(next) : undefined;
		if (next && nextSlot && decision.outcome !== "dismiss")
			settle(deck.valuesOf(next).s, nextSlot.s, SPRINGS.settle, motion);
		void Promise.resolve(
			commit(deck, id, decision, velocity, {
				stagger: knobs.followStaggerMs,
				stiffness: knobs.flyStiffness,
				damping: knobs.flyDamping,
			}),
		).then(() => {
			if (decision.outcome === "back") readouts.set({ phase: "rest" });
		});
	}

	function onDown(id: string, event: ReactPointerEvent<HTMLElement>) {
		const slot = deck.slotOf(id);
		if (deck.status !== "dealt" || !slot) return;
		const index = deck.order.indexOf(id);
		const next =
			index === deck.order.length - 1 ? deck.order[index - 1] : undefined;
		const card = deck.valuesOf(id);
		const box = event.currentTarget.getBoundingClientRect();
		const hinge = knobs.hinge && event.clientY - box.top > box.height / 2;
		const start = { u: card.u.get(), v: card.v.get() };
		let lifted = false;
		readouts.set({ phase: "pressed" });
		trackPointer(event, rtl, {
			move: (drag) => {
				if (!lifted && Math.hypot(drag.dx, drag.dy) < SLOP_PX) return;
				if (!lifted) pickUp(id, slot);
				lifted = true;
				carry(id, slot, start, drag, hinge, next, index);
			},
			up: (drag) => {
				if (lifted) drop(id, slot, start, drag, next, index);
				else {
					readouts.set({ phase: "rest" });
					tapCard(deck, taps, id, drag);
				}
			},
			cancel: () => {
				setHeld(null);
				void deck.putBack(id);
			},
		});
	}

	return <DeckCards deck={deck} rtl={rtl} held={held} onDown={onDown} />;
}
