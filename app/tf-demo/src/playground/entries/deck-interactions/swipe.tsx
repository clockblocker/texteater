import { animate, motionValue } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";
import { DeckCards, type VariantProps } from "./deck-cards";
import type { Point, Rect, Slot } from "./geometry";
import { pileSlots } from "./layout";
import { REDUCED_EXIT_MS, SPRINGS, settle, transition } from "./motion-kit";
import { createTapCounter, type Drag, trackPointer } from "./pointer";
import { type Collapse, gatherInto } from "./swipe-collapse";
import {
	type Axis,
	armedAt,
	type DetentRules,
	shownAt,
	takeUp,
	type Verdict,
	verdictOf,
	zoneOf,
} from "./swipe-gesture";
import type { SwipeKnobs } from "./swipe-knobs";
import { type Panel, type PanelValues, SwipePanel } from "./swipe-panel";
import { tapCard } from "./tap-card";
import { useDeck } from "./use-deck";

/** A strip panel tucks this far under the next Card, past its rounded corners. */
const TUCK_PX = 16;
const POP = { ms: 240 };

/** One press, from the hand coming down to its release. */
type Gesture = {
	readonly id: string;
	readonly slot: Slot;
	readonly gen: number;
	/** Whether the Card is the front one: a Card behind swipes inline only. */
	readonly front: boolean;
	axis: Axis | null;
	/** The slop the hand moved to lock the axis; 0 when the Card was caught moving. */
	slop: number;
	/** The Card's offset along the axis when the hand took it. */
	start: number;
	armed: boolean;
	commits: boolean;
	/** The Card's offset for the hand, before the detent's snap is added. */
	shown: number;
	stop: (() => void) | null;
};

function along(axis: Axis, drag: Drag) {
	return axis === "inline"
		? { raw: drag.du, speed: drag.vu }
		: { raw: drag.dy, speed: drag.vy };
}

/** A slot's box as drawn: scaled about its centre, as its Card is. */
function drawn(slot: Slot): Rect {
	const w = slot.w * slot.s;
	const h = slot.h * slot.s;
	return { u: slot.u - (w - slot.w) / 2, v: slot.v - (h - slot.h) / 2, w, h };
}

/**
 * Where a Card's panel lies and how much of it shows: the whole Card in
 * front; for a Card behind, its strip down to the next Card's top, tucked
 * under that Card.
 */
function panelBox(slots: readonly Slot[], index: number) {
	const slot = slots[index];
	if (!slot) return null;
	const box = drawn(slot);
	const next = slots[index + 1];
	if (!next) return { rect: box, visible: box.h };
	const visible = Math.max(0, drawn(next).v - box.v);
	return { rect: { ...box, h: Math.min(box.h, visible + TUCK_PX) }, visible };
}

/**
 * D, Swipe actions, as iOS Mail's full swipe: the Card slides on one axis
 * and uncovers an action under it. Short of the detent the action is
 * tinted and the Card returns; at the detent it lags, then snaps through
 * as the colour floods in and the icon locks to its edge, and from there
 * a release commits. A flick outward commits too; a flick back cancels.
 */
export function SwipeVariant({
	frame,
	rtl,
	motion,
	readouts,
	knobs,
	deal,
}: VariantProps<SwipeKnobs>) {
	const deck = useDeck({ frame, motion, readouts, deal, layout: pileSlots });
	const [held, setHeld] = useState<string | null>(null);
	const [panel, setPanel] = useState<Panel | null>(null);
	const [armed, setArmed] = useState(false);
	const [values] = useState<PanelValues>(() => ({
		flood: motionValue(0),
		lock: motionValue(0),
		pop: motionValue(1),
		fade: motionValue(1),
	}));
	/** The detent's snap, added to the Card's offset and sprung away. */
	const [kick] = useState(() => motionValue(0));
	const [taps] = useState(() => createTapCounter());
	const gen = useRef(0);
	const collapse = useRef<Collapse | null>(null);

	function rules(slot: Slot, axis: Axis): DetentRules {
		return {
			detent: knobs.detent,
			hysteresis: knobs.hysteresis,
			resistance: motion.reduce ? 0 : knobs.resistance,
			band: knobs.detentBand,
			end: axis === "inline" ? slot.w * slot.s : slot.h * slot.s,
			rubberLimit: knobs.rubberLimit,
		};
	}

	function place(g: Gesture) {
		const card = deck.valuesOf(g.id);
		if (g.axis === "inline") card.u.set(g.slot.u + g.shown + kick.get());
		else card.v.set(g.slot.v + g.shown + kick.get());
	}

	/** Shows whether a release now would commit, all on one frame. */
	function signal(commits: boolean) {
		setArmed(commits);
		animate(
			values.flood,
			commits ? 1 : 0,
			transition({ ms: knobs.floodMs }, motion),
		);
		settle(
			values.lock,
			commits ? 1 : 0,
			{ stiffness: knobs.lockStiffness, damping: knobs.lockDamping },
			motion,
		);
		if (commits && !motion.reduce)
			animate(
				values.pop,
				[1, knobs.popScale, 1],
				transition(POP, motion),
			);
		if (knobs.haptic && "vibrate" in navigator)
			navigator.vibrate(commits ? 10 : 6);
	}

	function begin(g: Gesture, caught: boolean) {
		const card = deck.valuesOf(g.id);
		/* the Card keeps its place in the pile: one from behind slides out
		   from between its neighbours, over its panel and under the rest */
		const z = card.z.get();
		deck.hold(g.id);
		card.z.set(z);
		kick.jump(0);
		g.stop = kick.on("change", () => place(g));
		const axis = g.axis ?? "inline";
		const gathering = collapse.current;
		if (gathering?.lead !== g.id || gathering.axis !== axis) {
			gathering?.scatter();
			collapse.current = gatherInto(deck, g.id, axis, {
				detent: knobs.detent,
				curve: knobs.collapseCurve,
			});
		}
		if (!caught) {
			values.flood.jump(0);
			values.lock.jump(0);
			values.pop.jump(1);
			values.fade.jump(1);
			setArmed(false);
		}
		setHeld(g.id);
		readouts.set({ phase: "carrying" });
	}

	function move(g: Gesture, drag: Drag) {
		const axis = g.axis;
		if (!axis) return;
		const { raw, speed } = along(axis, drag);
		const pull = g.start + takeUp(raw, g.slop, knobs.takeUp);
		const distance = Math.abs(pull);
		const sign = pull < 0 ? -1 : 1;
		const rule = rules(g.slot, axis);
		const was = g.armed;
		g.armed = armedAt(distance, was, rule);
		const shown = sign * shownAt(distance, g.armed, rule);
		/* with resistance, crossing the detent jumps the Card: the jump goes
		   to the kick, which springs it away */
		const jump =
			g.armed === was ? 0 : shown - sign * shownAt(distance, was, rule);
		g.shown = shown;
		if (jump !== 0) {
			/* jump, not set: a set would hand the spring the jump as velocity */
			kick.jump(kick.get() - jump);
			animate(
				kick,
				0,
				transition(
					{
						stiffness: knobs.snapStiffness,
						damping: knobs.snapDamping,
					},
					motion,
				),
			);
		}
		place(g);
		const verdict = verdictOf({
			axis,
			pull,
			speed,
			armed: g.armed,
			flickSpeed: knobs.flickSpeed,
		});
		const next: Panel = { id: g.id, axis, sign, zone: verdict.zone };
		setPanel((current) =>
			current?.id === next.id &&
			current.axis === next.axis &&
			current.sign === next.sign
				? current
				: next,
		);
		if (verdict.commits !== g.commits) {
			g.commits = verdict.commits;
			signal(verdict.commits);
		}
		readouts.set({
			zone: verdict.commits
				? `${verdict.zone} · ${verdict.reason}`
				: `back · ${verdict.zone} at ${knobs.detent.toString()} (${Math.round(distance).toString()})`,
			velocity: { x: drag.vx, y: drag.vy },
			tilt: 0,
		});
	}

	/** What the release does: what the panel showed, read again at the hand's last spot. */
	function verdictAt(g: Gesture, axis: Axis, drag: Drag | null) {
		if (!drag) {
			const pull = g.start;
			return {
				pull,
				speed: 0,
				verdict: {
					commits: false,
					zone: zoneOf(axis, pull),
					reason: "cancelled",
				} satisfies Verdict,
			};
		}
		const { raw, speed } = along(axis, drag);
		const pull = g.start + takeUp(raw, g.slop, knobs.takeUp);
		const armed = armedAt(Math.abs(pull), g.armed, rules(g.slot, axis));
		const verdict = verdictOf({
			axis,
			pull,
			speed,
			armed,
			flickSpeed: knobs.flickSpeed,
		});
		return { pull, speed, verdict };
	}

	/**
	 * Short of the detent: back to the slot on a spring that keeps the
	 * hand's speed, taking the gathered Cards home with it. Reduced, the
	 * spring is critically damped and starts at rest, so it never overshoots.
	 */
	async function putBack(g: Gesture, velocity: Point) {
		const card = deck.valuesOf(g.id);
		const k = knobs.reducedReturnStiffness;
		const spec = motion.reduce
			? { stiffness: k, damping: 2 * Math.sqrt(k) }
			: SPRINGS.settle;
		const speed = motion.reduce ? { u: 0, v: 0 } : velocity;
		await Promise.all([
			animate(card.u, g.slot.u, transition(spec, motion, speed.u * 1000)),
			animate(card.v, g.slot.v, transition(spec, motion, speed.v * 1000)),
			settle(card.lift, 0, SPRINGS.settle, motion),
		]);
		if (gen.current !== g.gen) return;
		collapse.current?.stop();
		collapse.current = null;
		deck.release(g.id);
		setPanel(null);
		readouts.set({ phase: "rest" });
	}

	/**
	 * Past it: the panel fades as the Card opens, or as the Card and the
	 * Deck gathered under it leave as one, each keeping its speed.
	 */
	async function commit(
		g: Gesture,
		axis: Axis,
		pull: number,
		verdict: Verdict,
		velocity: Point,
	) {
		animate(
			values.fade,
			0,
			transition(
				{ ms: motion.reduce ? REDUCED_EXIT_MS : knobs.panelFadeMs },
				motion,
			),
		);
		collapse.current?.stop();
		collapse.current = null;
		if (verdict.zone === "expand") {
			await deck.expand(g.id, velocity);
			if (gen.current === g.gen) setPanel(null);
			return;
		}
		const sign = pull < 0 ? -1 : 1;
		await deck.dismiss({
			direction:
				axis === "inline" ? { u: sign, v: 0 } : { u: 0, v: sign },
			lead: g.id,
			stagger: 0,
			velocity,
		});
		setPanel(null);
	}

	function release(g: Gesture, drag: Drag | null) {
		const axis = g.axis;
		if (!axis) return;
		g.stop?.();
		g.stop = null;
		kick.stop();
		const { pull, speed, verdict } = verdictAt(g, axis, drag);
		setHeld(null);
		if (verdict.commits !== g.commits) {
			g.commits = verdict.commits;
			signal(verdict.commits);
		}
		readouts.set({
			phase: "settling",
			zone: null,
			outcome: `${verdict.commits ? verdict.zone : "back"} · ${verdict.reason}`,
		});
		/* the Card is rigid across the axis, so it hands on only the speed along it */
		const velocity =
			axis === "inline" ? { u: speed, v: 0 } : { u: 0, v: speed };
		if (verdict.commits) void commit(g, axis, pull, verdict, velocity);
		else void putBack(g, velocity);
	}

	function onDown(id: string, event: ReactPointerEvent<HTMLElement>) {
		const slot = deck.slotOf(id);
		if (deck.status !== "dealt" || !slot) return;
		if (collapse.current && collapse.current.lead !== id) {
			collapse.current.scatter();
			collapse.current = null;
		}
		const card = deck.valuesOf(id);
		const g: Gesture = {
			id,
			slot,
			gen: ++gen.current,
			front: deck.order.at(-1) === id,
			axis: null,
			slop: 0,
			start: 0,
			armed: false,
			commits: false,
			shown: 0,
			stop: null,
		};
		settle(card.lift, knobs.pressLift, SPRINGS.settle, motion);
		readouts.set({ phase: "pressed" });
		const off = { u: card.u.get() - slot.u, v: card.v.get() - slot.v };
		if (Math.max(Math.abs(off.u), Math.abs(off.v)) > 0.5) {
			/* caught on its way back: the hand takes it where it is, on its axis */
			g.axis = Math.abs(off.u) >= Math.abs(off.v) ? "inline" : "block";
			g.start = g.axis === "inline" ? off.u : off.v;
			g.shown = g.start;
			begin(g, true);
		}
		trackPointer(event, rtl, {
			move: (drag) => {
				if (!g.axis) {
					if (Math.hypot(drag.dx, drag.dy) < knobs.axisLock) return;
					g.axis =
						!g.front || Math.abs(drag.du) >= Math.abs(drag.dy)
							? "inline"
							: "block";
					g.slop = knobs.axisLock;
					begin(g, false);
				}
				move(g, drag);
			},
			up: (drag) => {
				if (g.axis) {
					release(g, drag);
					return;
				}
				settle(card.lift, 0, SPRINGS.settle, motion);
				readouts.set({ phase: "rest" });
				tapCard(deck, taps, id, drag);
			},
			cancel: () => {
				if (g.axis) release(g, null);
				else settle(card.lift, 0, SPRINGS.settle, motion);
			},
		});
	}

	const index = panel ? deck.order.indexOf(panel.id) : -1;
	const box = panelBox(deck.slots, index);
	const slot = panel ? deck.slotOf(panel.id) : undefined;
	const owner = panel ? deck.valuesOf(panel.id) : null;
	return (
		<>
			{panel && box && slot && owner && deck.status !== "gone" ? (
				<SwipePanel
					key={`${panel.id}-${panel.axis}`}
					panel={panel}
					rect={box.rect}
					visible={box.visible}
					position={panel.axis === "inline" ? owner.u : owner.v}
					base={panel.axis === "inline" ? slot.u : slot.v}
					z={owner.z}
					values={values}
					armed={armed}
					detent={knobs.detent}
					tint={knobs.tint}
					labels={knobs.panelLabels}
					rtl={rtl}
					reduce={motion.reduce}
				/>
			) : null}
			<DeckCards deck={deck} rtl={rtl} held={held} onDown={onDown} />
		</>
	);
}
