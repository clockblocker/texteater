import { cancelFrame, frame } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { DISSOLVE_MS } from "./card-move";
import {
	boxUnder,
	contains,
	type Follow,
	followStep,
	grabOf,
	padRect,
	reducedHomeOf,
} from "./carry";
import type { Point, Slot } from "./geometry";
import {
	buildPoseOf,
	buildShareOf,
	holdStateOf,
	liftedPose,
	type PoseRules,
} from "./hold";
import { type MotionContext, SPRINGS, settle, tweenTo } from "./motion-kit";
import type { Drag } from "./pointer";
import type { Readouts } from "./readouts";
import type { SwipeKnobs } from "./swipe-knobs";
import type { Deck } from "./use-deck";

/** The lift's pop into the hand: a little bounce, ζ about 0.7. */
const LIFT_POP = { stiffness: 520, damping: 32 };

/** What the swipe hears of a press's hold and carry. */
type Hooks = {
	/** A tap's shuffle or a close is moving the Card: the hold builds nothing on it, and only its lift takes it. */
	readonly moving: boolean;
	/** Whether this press is still the latest. */
	readonly current: () => boolean;
	/** The hold has lifted the Card: whatever the swipe had of it, it lets go. */
	readonly onLift: () => void;
	/** The hand has let the carried Card go. */
	readonly onDrop: () => void;
	/** The Card is home, if this press is still the latest. */
	readonly onLanded: () => void;
};

/** One press as the hold and the carry see it; each call says whether the carry has the hand. */
export type Press = {
	readonly move: (drag: Drag) => boolean;
	/** The swipe has locked its axis: no lift comes, and what the hold built goes. */
	readonly forgo: () => void;
	readonly up: (drag: Drag) => boolean;
	readonly cancel: () => boolean;
};

/**
 * D's hold to lift and the carry after it. A press held still lifts its
 * Card into the hand, where it trails the hand in 2D, the spot it was
 * lifted by kept under the hand, while the Deck closes its gap behind
 * it and the stand-in pad shows. A release anywhere puts it back into
 * its slot on a spring that carries the hand's speed, and restacks it at
 * once, so it slides home between its neighbours; over the pad, the pad
 * acknowledges the drop. Under reduced motion the hand still moves it
 * 1:1, nothing grows, and a move home of more than 24 px dissolves.
 */
export function useHoldCarry({
	deck,
	rtl,
	motion,
	readouts,
	knobs,
}: {
	readonly deck: Deck;
	readonly rtl: boolean;
	readonly motion: MotionContext;
	readouts: Readouts;
	readonly knobs: SwipeKnobs;
}) {
	/** The Card in the hand, for the pad. */
	const [carried, setCarried] = useState<string | null>(null);
	const [over, setOver] = useState(false);
	/** Bumped by every drop on the pad. */
	const [drops, setDrops] = useState(0);
	const stopLive = useRef<(() => void) | null>(null);
	/** The Cards on their way home from a carry, each with the drop that sent it: a press on one takes it over, and only that drop's landing puts it back in the Deck's hands. */
	const homing = useRef(new Map<string, object>());
	useEffect(() => () => stopLive.current?.(), []);
	const pad = padRect(deck.frame);

	function press(
		id: string,
		event: ReactPointerEvent<HTMLElement>,
		hooks: Hooks,
	): Press {
		stopLive.current?.();
		/* a Card on its way home from a carry: the hand catches it where it is */
		const caught = homing.current.delete(id);
		if (caught) deck.hold(id);
		const token = {};
		const element = event.currentTarget;
		/* the Deck's layer, measured once the hand is needed in it: a tap never lays the page out */
		let layer: DOMRect | undefined;
		/** Where the hand is, in the client's px. */
		let client = { x: event.clientX, y: event.clientY };
		const handNow = (): Point => {
			layer ??= element
				.closest("[data-deck-layer]")
				?.getBoundingClientRect();
			if (!layer) return { u: client.x, v: client.y };
			return {
				u: rtl ? layer.right - client.x : client.x - layer.left,
				v: client.y - layer.top,
			};
		};
		const pressedAt = performance.now();
		const card = deck.valuesOf(id);
		const rules: PoseRules = {
			rest: deck.slotOf(id)?.s ?? 1,
			/* every Card in the hand is an open Card, lifted */
			lifted: (deck.slots.at(-1)?.s ?? 1) * knobs.liftScale,
			pressLift: knobs.pressLift,
			reduce: motion.reduce,
		};
		let phase: "holding" | "off" | "carrying" | "done" = "holding";
		let built = false;
		let grab: Point = { u: 0, v: 0 };
		let fu: Follow = { x: 0, velocity: 0 };
		let fv: Follow = { x: 0, velocity: 0 };
		let lit = false;
		/** Whether a swipe has taken the press. */
		let swiped = false;

		const build = () => {
			const share = buildShareOf(
				performance.now() - pressedAt,
				knobs.holdMs,
				knobs.holdBuildDelayMs,
			);
			if (share <= 0) return;
			if (!built) {
				built = true;
				card.lift.stop();
				card.s.stop();
			}
			const pose = buildPoseOf(share, knobs.holdBuild, rules);
			card.lift.set(pose.lift);
			card.s.set(pose.s);
		};
		/* the hold builds on Motion's frame loop, as the Card is drawn */
		if (!hooks.moving && knobs.holdBuild !== "none")
			frame.update(build, true);
		const timer = window.setTimeout(lift, knobs.holdMs);

		function endHold() {
			window.clearTimeout(timer);
			cancelFrame(build);
		}

		/* no lift comes: the Card goes back to the press's pose, or to rest */
		function forgo(to: number) {
			if (phase !== "holding") return;
			phase = "off";
			endHold();
			if (!built) return;
			built = false;
			settle(card.lift, to, SPRINGS.settle, motion);
			settle(card.s, rules.rest, SPRINGS.settle, motion);
		}

		/* the Card under the hand each frame, as its scale is now */
		const follow = ({ delta }: { readonly delta: number }) => {
			const to = boxUnder(
				handNow(),
				grab,
				{ w: card.w.get(), h: card.h.get() },
				card.s.get(),
			);
			if (knobs.carryFollow === "1:1" || motion.reduce) {
				fu = { x: to.u, velocity: 0 };
				fv = { x: to.v, velocity: 0 };
			} else {
				const k = knobs.followStiffness * motion.timeScale ** 2;
				fu = followStep(fu, to.u, k, delta);
				fv = followStep(fv, to.v, k, delta);
			}
			card.u.set(fu.x);
			card.v.set(fv.x);
		};

		function lift() {
			if (phase !== "holding") return;
			endHold();
			phase = "carrying";
			built = false;
			hooks.onLift();
			deck.hold(id);
			card.lift.stop();
			card.s.stop();
			grab = grabOf(handNow(), {
				u: card.u.get(),
				v: card.v.get(),
				w: card.w.get(),
				h: card.h.get(),
				s: card.s.get(),
			});
			fu = { x: card.u.get(), velocity: 0 };
			fv = { x: card.v.get(), velocity: 0 };
			const to = liftedPose(rules);
			settle(card.s, to.s, LIFT_POP, motion);
			settle(card.lift, to.lift, SPRINGS.settle, motion);
			if (knobs.closeUp) deck.liftOut(id);
			if (knobs.haptic && "vibrate" in navigator) navigator.vibrate(15);
			setCarried(id);
			readouts.set({ phase: "carrying", zone: "lifted" });
			frame.update(follow, true);
		}

		function light(now: boolean) {
			if (now === lit) return;
			lit = now;
			setOver(now);
			readouts.set({ zone: now ? "lifted · over the pad" : "lifted" });
		}

		/** Home from where the Card shows: travelling, or reduced, a short tween or a dissolve. */
		async function home(slot: Slot, velocity: Point) {
			const from = { u: card.u.get(), v: card.v.get() };
			if (!motion.reduce)
				return deck.place(id, slot, SPRINGS.settle, velocity);
			if (reducedHomeOf(from, slot) === "tween")
				return deck.place(id, slot, SPRINGS.settle);
			await tweenTo(card.o, 0, DISSOLVE_MS, motion).finished;
			if (homing.current.get(id) !== token) return;
			for (const key of ["u", "v", "w", "h", "r", "s"] as const)
				card[key].jump(slot[key]);
			card.lift.jump(0);
			await tweenTo(card.o, 1, DISSOLVE_MS, motion).finished;
		}

		function drop(drag: Drag | null) {
			phase = "done";
			cancelFrame(follow);
			const onPad = drag !== null && contains(pad, handNow());
			light(false);
			setCarried(null);
			if (onPad) setDrops((count) => count + 1);
			deck.liftOut(null);
			/* it slides home between its neighbours, not over them */
			card.z.set(deck.restZ(id));
			hooks.onDrop();
			const followed = knobs.carryFollow === "stiff" && !motion.reduce;
			const velocity =
				drag === null
					? { u: 0, v: 0 }
					: followed
						? {
								u: fu.velocity / 1000 / motion.timeScale,
								v: fv.velocity / 1000 / motion.timeScale,
							}
						: { u: drag.vu, v: drag.vy };
			readouts.set({
				phase: "settling",
				zone: null,
				outcome: onPad ? "back · dropped on the pad" : "back · let go",
			});
			homing.current.set(id, token);
			const slot = deck.slotOf(id);
			const landed = () => {
				if (homing.current.get(id) !== token) return;
				homing.current.delete(id);
				deck.release(id);
				if (hooks.current()) hooks.onLanded();
			};
			if (!slot) landed();
			else void home(slot, velocity).then(landed);
		}

		stopLive.current = () => {
			if (phase === "holding") endHold();
			if (phase === "carrying") drop(null);
		};

		return {
			move: (drag) => {
				client = { x: drag.clientX, y: drag.clientY };
				if (phase === "carrying") {
					light(contains(pad, handNow()));
					readouts.set({ velocity: { x: drag.vx, y: drag.vy } });
					return true;
				}
				if (
					phase === "holding" &&
					holdStateOf({
						elapsed: drag.elapsed,
						travel: Math.hypot(drag.dx, drag.dy),
						ms: knobs.holdMs,
						slop: knobs.holdSlop,
					}) === "moved"
				)
					forgo(knobs.pressLift);
				return false;
			},
			forgo: () => {
				swiped = true;
				forgo(knobs.pressLift);
			},
			up: (drag) => {
				client = { x: drag.clientX, y: drag.clientY };
				if (phase === "carrying") {
					drop(drag);
					return true;
				}
				forgo(0);
				const slot = deck.slotOf(id);
				if (caught && !swiped && slot) {
					/* a tap on a Card it caught sends it on home; the tap's
					   shuffle, if any, takes it from there */
					card.z.set(deck.restZ(id));
					void deck.place(id, slot);
				}
				return false;
			},
			cancel: () => {
				if (phase === "carrying") {
					drop(null);
					return true;
				}
				forgo(0);
				return false;
			},
		};
	}

	return { carried, over, drops, pad, press };
}
