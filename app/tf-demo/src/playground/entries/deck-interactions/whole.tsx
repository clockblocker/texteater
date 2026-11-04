import { type PointerEvent as ReactPointerEvent, useState } from "react";
import { DeckCards, type VariantProps } from "./deck-cards";
import { flickOf, flickVector, type Point, project, unit } from "./geometry";
import type { WholeKnobs } from "./knobs";
import { pileSlots } from "./layout";
import {
	follow,
	type MotionContext,
	SPRINGS,
	settle,
	tweenTo,
} from "./motion-kit";
import {
	createTapCounter,
	type Drag,
	framePoint,
	SLOP_PX,
	trackPointer,
} from "./pointer";
import { tapCard } from "./stack";
import { useTableCarry } from "./table-carry";
import { type Deck, useDeck } from "./use-deck";

const HOLD_SCALE = 1.04;

/** A whole-Deck release: a throw (not upward) or inline-start or down past the line sweeps. */
function deckRelease(
	offset: Point,
	velocity: Point,
	threshold: number,
	flickSpeed: number,
) {
	const flick = flickOf({ travel: offset, velocity, minSpeed: flickSpeed });
	if (flick && !(flick.axis === "block" && flick.sign < 0))
		return {
			away: true,
			reason: `flick ${flick.speed.toFixed(2)}`,
			direction: flickVector(flick),
		};
	const ahead = project(offset, velocity);
	const away = ahead.u <= -threshold || ahead.v >= threshold;
	const distance = Math.round(Math.max(-ahead.u, ahead.v));
	return {
		away,
		reason: away ? `distance ${distance.toString()}` : "short",
		direction: unit(ahead),
	};
}

/** The Deck rides the hand: the Card held 1:1, the rest trailing on a spring. */
function dragDeck(
	deck: Deck,
	id: string,
	offset: Point,
	knobs: WholeKnobs,
	motion: MotionContext,
) {
	const trail = { stiffness: knobs.deckFollowStiffness, damping: 45 };
	for (const other of deck.order) {
		const slot = deck.slotOf(other);
		if (!slot) continue;
		const card = deck.valuesOf(other);
		const to = { u: slot.u + offset.u, v: slot.v + offset.v };
		if (other === id || motion.reduce) {
			card.u.set(to.u);
			card.v.set(to.v);
		} else {
			follow(card.u, to.u, trail, motion);
			follow(card.v, to.v, trail, motion);
		}
	}
}

/**
 * E, Whole Deck, Card on hold: a plain drag moves the whole Deck as one
 * sheet; a press held for `holdMs` lifts one Card, which then carries as
 * in B, targets included. Intent is declared up front, so nothing tears
 * loose mid-gesture.
 */
export function WholeVariant({
	frame,
	rtl,
	motion,
	readouts,
	knobs,
	deal,
}: VariantProps<WholeKnobs>) {
	const deck = useDeck({ frame, motion, readouts, deal, layout: pileSlots });
	const table = useTableCarry({ deck, frame, rtl, motion, readouts, knobs });
	const [taps] = useState(() => createTapCounter());
	const [dragging, setDragging] = useState(false);
	/** The hold counts down in real time; slow-mo slows only the motion. */
	const realTime = { ...motion, timeScale: 1 };

	function startHold(id: string) {
		const card = deck.valuesOf(id);
		const slot = deck.slotOf(id);
		if (!motion.reduce && slot)
			tweenTo(card.s, slot.s * HOLD_SCALE, knobs.holdMs, realTime);
		tweenTo(card.hold, 1, knobs.holdMs, realTime);
		readouts.set({ phase: "holding" });
	}

	function cancelHold(id: string) {
		const card = deck.valuesOf(id);
		const slot = deck.slotOf(id);
		if (slot) settle(card.s, slot.s, SPRINGS.settle, motion);
		settle(card.hold, 0, SPRINGS.settle, motion);
	}

	function releaseDeck(id: string, drag: Drag) {
		const offset = { u: drag.du, v: drag.dy };
		const velocity = { u: drag.vu, v: drag.vy };
		const decision = deckRelease(
			offset,
			velocity,
			knobs.threshold,
			knobs.flickSpeed,
		);
		setDragging(false);
		readouts.set({
			phase: "settling",
			zone: null,
			outcome: `${decision.away ? "dismiss" : "back"} · ${decision.reason}`,
		});
		if (decision.away) {
			void deck.dismiss({
				direction: decision.direction,
				lead: id,
				stagger: 0,
				velocity,
			});
			return;
		}
		for (const other of deck.order) void deck.putBack(other, SPRINGS.sheet);
		readouts.set({ phase: "rest" });
	}

	function onDown(id: string, event: ReactPointerEvent<HTMLElement>) {
		const card = deck.valuesOf(id);
		if (deck.status !== "dealt" || !deck.slotOf(id)) return;
		const start = { u: card.u.get(), v: card.v.get() };
		const at = framePoint(
			event.currentTarget,
			event.clientX,
			event.clientY,
			rtl,
		);
		const grab = { u: at.u - start.u, v: at.v - start.v };
		let mode: "pressed" | "deck" | "card" = "pressed";
		startHold(id);
		const timer = setTimeout(() => {
			if (mode !== "pressed") return;
			mode = "card";
			card.hold.set(0);
			table.pickUp(id, grab);
		}, knobs.holdMs);
		trackPointer(event, rtl, {
			move: (drag) => {
				if (
					mode === "pressed" &&
					Math.hypot(drag.dx, drag.dy) < SLOP_PX
				)
					return;
				if (mode === "pressed") {
					clearTimeout(timer);
					cancelHold(id);
					mode = "deck";
					for (const other of deck.order) deck.hold(other);
					setDragging(true);
					readouts.set({ phase: "deck drag" });
				}
				if (mode === "card") {
					table.carry(
						id,
						{ u: start.u + drag.du, v: start.v + drag.dy },
						drag,
					);
					return;
				}
				dragDeck(deck, id, { u: drag.du, v: drag.dy }, knobs, motion);
				const offset = { u: drag.du, v: drag.dy };
				const ahead = deckRelease(
					offset,
					{ u: 0, v: 0 },
					knobs.threshold,
					knobs.flickSpeed,
				);
				readouts.set({
					zone: ahead.away ? "dismiss" : "back",
					velocity: { x: drag.vx, y: drag.vy },
					tilt: 0,
				});
			},
			up: (drag) => {
				clearTimeout(timer);
				if (mode === "card")
					void table.drop(
						id,
						{ u: start.u + drag.du, v: start.v + drag.dy },
						drag,
					);
				else if (mode === "deck") releaseDeck(id, drag);
				else {
					cancelHold(id);
					readouts.set({ phase: "rest" });
					tapCard(deck, taps, id, drag);
				}
			},
			cancel: () => {
				clearTimeout(timer);
				cancelHold(id);
				if (mode === "card") table.cancel(id);
				else for (const other of deck.order) void deck.putBack(other);
				setDragging(false);
			},
		});
	}

	return (
		<>
			{table.view}
			<DeckCards
				deck={deck}
				rtl={rtl}
				held={
					table.held ??
					(dragging ? (deck.order.at(-1) ?? null) : null)
				}
				ring={motion.reduce}
				onDown={onDown}
			/>
		</>
	);
}
