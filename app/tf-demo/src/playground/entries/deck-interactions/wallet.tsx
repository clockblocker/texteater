import { motion as m, motionValue } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useState,
} from "react";
import { CardFace } from "./card-view";
import { DeckCards, type VariantProps } from "./deck-cards";
import {
	clamp,
	FLICK_TRAVEL_PX,
	lerp,
	PROJECTION_MS,
	rubberBand,
	type Slot,
} from "./geometry";
import type { WalletKnobs } from "./knobs";
import { coverRect, type Frame, pileSlots } from "./layout";
import { SPRINGS, tweenTo } from "./motion-kit";
import { createTapCounter, type Drag, trackPointer } from "./pointer";
import { tapCard } from "./stack";
import { useDeck } from "./use-deck";
import { cardById } from "./words";

type Mode = "sideways" | "expand" | "stack";

const DOWN = { u: 0, v: 1 };

/**
 * C, Wallet: up opens, down puts away. Pulling a Card up scrubs it into
 * the Cover; pulling down takes the whole stack with the hand like a
 * sheet; sideways the Card only rubber-bands, and a flick sweeps. Nothing
 * leans, and every release short of a line is back.
 */
export function WalletVariant({
	frame,
	rtl,
	motion,
	readouts,
	knobs,
	deal,
}: VariantProps<WalletKnobs>) {
	const layout = useCallback(
		(at: Frame, count: number) => pileSlots(at, count, knobs.peek),
		[knobs.peek],
	);
	const deck = useDeck({ frame, motion, readouts, deal, layout });
	const [held, setHeld] = useState<string | null>(null);
	/** The reduced scrub: the Cover fades in over the Card, keyed to `p`. */
	const [fading, setFading] = useState<string | null>(null);
	const [fade] = useState(() => motionValue(0));
	const [taps] = useState(() => createTapCounter());
	const cover = coverRect(frame);

	function scrub(id: string, slot: Slot, p: number) {
		const card = deck.valuesOf(id);
		if (motion.reduce) {
			fade.set(p);
			return;
		}
		card.u.set(lerp(slot.u, cover.u, p));
		card.v.set(lerp(slot.v, cover.v, p));
		card.w.set(lerp(slot.w, cover.w, p));
		card.h.set(lerp(slot.h, cover.h, p));
		card.s.set(lerp(slot.s, 1, p));
	}

	function moveStack(dy: number) {
		const travel = dy > 0 ? dy : rubberBand(dy, 20);
		for (const other of deck.order) {
			const slot = deck.slotOf(other);
			if (slot) deck.valuesOf(other).v.set(slot.v + travel);
		}
	}

	function move(id: string, slot: Slot, mode: Mode, drag: Drag) {
		const card = deck.valuesOf(id);
		if (mode === "sideways") {
			card.u.set(slot.u + rubberBand(drag.du, knobs.rubberLimit));
			readouts.set({ zone: "back (rubber band)" });
		} else if (mode === "expand") {
			const p = clamp(-drag.dy / knobs.expandDistance, 0, 1);
			scrub(id, slot, p);
			readouts.set({ zone: `expand p=${p.toFixed(2)}` });
		} else {
			moveStack(drag.dy);
			readouts.set({
				zone: drag.dy >= knobs.dismissDistance ? "dismiss" : "back",
			});
		}
		readouts.set({ velocity: { x: drag.vx, y: drag.vy }, tilt: 0 });
	}

	async function finishFade(to: number) {
		await tweenTo(fade, to, 140, motion);
		setFading(null);
	}

	function releaseExpand(id: string, drag: Drag) {
		const p = clamp(-drag.dy / knobs.expandDistance, 0, 1);
		const ahead = p + (-drag.vy * PROJECTION_MS) / knobs.expandDistance;
		const done = ahead >= knobs.completion;
		readouts.set({
			outcome: `${done ? "expand" : "back"} · p ${ahead.toFixed(2)}`,
		});
		if (done) {
			void deck.expand(id, { u: 0, v: drag.vy }, SPRINGS.reflow);
			if (motion.reduce) void finishFade(1).then(() => fade.set(0));
			return;
		}
		if (motion.reduce) void finishFade(0);
		void deck
			.putBack(id, SPRINGS.reflow, { u: 0, v: drag.vy })
			.then(() => readouts.set({ phase: "rest" }));
	}

	function releaseStack(id: string, drag: Drag) {
		const away =
			drag.dy >= knobs.dismissDistance || drag.vy >= knobs.flickSpeed;
		readouts.set({
			outcome: away
				? `dismiss · ${drag.vy >= knobs.flickSpeed ? `flick ${drag.vy.toFixed(2)}` : `distance ${Math.round(drag.dy).toString()}`}`
				: `back · short ${Math.round(drag.dy).toString()}`,
		});
		if (away) {
			void deck.dismiss({
				direction: DOWN,
				lead: id,
				stagger: 0,
				velocity: { u: 0, v: drag.vy },
			});
			return;
		}
		for (const other of deck.order) void deck.putBack(other, SPRINGS.sheet);
	}

	function releaseSideways(id: string, drag: Drag) {
		const flick =
			Math.abs(drag.vu) >= knobs.flickSpeed &&
			Math.abs(drag.du) >= FLICK_TRAVEL_PX;
		readouts.set({
			outcome: flick
				? `dismiss · flick ${Math.abs(drag.vu).toFixed(2)}`
				: "back · sideways",
		});
		if (flick) {
			void deck.dismiss({
				direction: { u: Math.sign(drag.vu), v: 0 },
				lead: id,
				stagger: 40,
				velocity: { u: drag.vu, v: 0 },
			});
			return;
		}
		void deck
			.putBack(id, SPRINGS.settle)
			.then(() => readouts.set({ phase: "rest" }));
	}

	function release(id: string, mode: Mode, drag: Drag) {
		setHeld(null);
		readouts.set({ phase: "settling", zone: null });
		if (mode === "expand") releaseExpand(id, drag);
		else if (mode === "stack") releaseStack(id, drag);
		else releaseSideways(id, drag);
	}

	function lock(id: string, drag: Drag): Mode {
		const mode: Mode =
			Math.abs(drag.du) >= Math.abs(drag.dy)
				? "sideways"
				: drag.dy < 0
					? "expand"
					: "stack";
		if (mode === "stack") for (const other of deck.order) deck.hold(other);
		else deck.hold(id);
		if (mode === "expand" && motion.reduce) {
			fade.set(0);
			setFading(id);
		}
		setHeld(id);
		readouts.set({ phase: mode === "expand" ? "scrubbing" : "carrying" });
		return mode;
	}

	function onDown(id: string, event: ReactPointerEvent<HTMLElement>) {
		const slot = deck.slotOf(id);
		if (deck.status !== "dealt" || !slot) return;
		let mode: Mode | null = null;
		readouts.set({ phase: "pressed" });
		trackPointer(event, rtl, {
			move: (drag) => {
				if (!mode && Math.hypot(drag.dx, drag.dy) < knobs.axisLock)
					return;
				mode ??= lock(id, drag);
				move(id, slot, mode, drag);
			},
			up: (drag) => {
				if (mode) release(id, mode, drag);
				else {
					readouts.set({ phase: "rest" });
					tapCard(deck, taps, id, drag);
				}
			},
			cancel: () => {
				setHeld(null);
				for (const other of deck.order) void deck.putBack(other);
			},
		});
	}

	const fadingCard = fading ? cardById(fading) : undefined;
	return (
		<>
			<DeckCards deck={deck} rtl={rtl} held={held} onDown={onDown} />
			{fadingCard ? (
				<m.div
					aria-hidden="true"
					className="pointer-events-none absolute flex flex-col overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper"
					style={{
						insetInlineStart: cover.u,
						top: cover.v,
						width: cover.w,
						height: cover.h,
						opacity: fade,
						zIndex: 150,
					}}
				>
					<CardFace card={fadingCard} expanded={false} />
				</m.div>
			) : null}
		</>
	);
}
