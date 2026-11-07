import { animate, motionValue } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";
import { DeckCards, DeckLayer, type VariantProps } from "./deck-cards";
import type { Rect, Slot } from "./geometry";
import { pileSlots } from "./layout";
import { REDUCED_EXIT_MS, SPRINGS, settle, transition } from "./motion-kit";
import { createTapCounter, type Drag, trackPointer } from "./pointer";
import { type Binding, bindDeck } from "./swipe-collapse";
import {
	type Axis,
	takeUp,
	travelOf,
	type Verdict,
	verdictOf,
	zoneOf,
} from "./swipe-gesture";
import type { SwipeKnobs } from "./swipe-knobs";
import { type Panel, type PanelValues, SwipePanel } from "./swipe-panel";
import { tapCard } from "./tap-card";
import { useDeck } from "./use-deck";
import { DUMMY_DECK } from "./words";

/** A strip panel tucks this far under the next Card, past its rounded corners. */
const TUCK_PX = 16;
const POP = { ms: 240 };
/** The Deck's exit fade runs even: an eased one is all but out in its first half, before the drift has shown. */
const EVEN = [0, 0, 1, 1] as const;
/** Under this much height the panel shows its icon without the label. */
const LABEL_ROOM_PX = 56;

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
	commits: boolean;
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
 * Where a Card's panel lies and how much of it shows: under the Card where
 * the hand took it (`anchor`). It stays `inset` px inside the Card's edges
 * across the axis, past its rounded corners, so only what the Card
 * uncovers along the axis ever shows. It shares the Card's z-index, so
 * the Cards in front lie over it as they lie over the Card. Toward Open,
 * where they stay put, a Card behind shows only the strip above the next
 * Card, and its panel is that strip, tucked under that Card; toward Close
 * deck they come up onto the Card and uncover its footprint as they go,
 * and its panel is all of it, as the front Card's is.
 */
function panelBox(
	slots: readonly Slot[],
	index: number,
	panel: Panel,
	inset: number,
	anchor: { readonly u: number; readonly v: number },
) {
	const slot = slots[index];
	if (!slot) return null;
	const box = drawn({ ...slot, u: anchor.u, v: anchor.v });
	const next = slots[index + 1];
	if (next && panel.zone === "expand") {
		const visible = Math.max(0, drawn(next).v - box.v - inset);
		return {
			rect: { ...box, v: box.v + inset, h: visible + TUCK_PX },
			visible,
		};
	}
	const rect =
		panel.axis === "inline"
			? { ...box, v: box.v + inset, h: box.h - 2 * inset }
			: { ...box, u: box.u + inset, w: box.w - 2 * inset };
	return { rect, visible: rect.h };
}

/**
 * D, Swipe actions, as iOS Mail's full swipe: the Card slides on one axis
 * and uncovers an action under it, and toward Close deck the rest of the
 * Deck folds onto it, whichever Card it is, the Cards behind it coming
 * down under it and the ones in front coming up over it, each keeping its
 * place in the stack. One value, the pull, drives all of it, and one
 * threshold is the breakpoint: there the Deck is whole, the colour floods
 * in, the icon locks to the Card's edge, and a release commits. Short of
 * it, a release brings everything back. The Deck itself never moves on
 * hover: the Card under the pointer only lights its border.
 */
export function SwipeVariant({
	frame,
	rtl,
	motion,
	readouts,
	knobs,
	deal,
}: VariantProps<SwipeKnobs>) {
	const deck = useDeck({
		cards: DUMMY_DECK,
		frame,
		motion,
		readouts,
		deal,
		layout: pileSlots,
	});
	const [held, setHeld] = useState<string | null>(null);
	/** The Card under the hand from press to the end of its return: no Card lights meanwhile. */
	const [pressed, setPressed] = useState<string | null>(null);
	const [panel, setPanel] = useState<Panel | null>(null);
	const [anchor, setAnchor] = useState({ u: 0, v: 0 });
	const [armed, setArmed] = useState(false);
	const [values] = useState<PanelValues>(() => ({
		flood: motionValue(0),
		lock: motionValue(0),
		pop: motionValue(1),
		fade: motionValue(1),
	}));
	/** The swiped Card's offset along its axis: the swipe's one source of truth. */
	const [pull] = useState(() => motionValue(0));
	const [taps] = useState(() => createTapCounter());
	const gen = useRef(0);
	const binding = useRef<Binding | null>(null);

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

	function begin(g: Gesture, axis: Axis, caught: boolean) {
		const card = deck.valuesOf(g.id);
		/* the Card keeps its place in the pile: one from behind slides out
		   from between its neighbours, over its panel and under the rest */
		const z = card.z.get();
		deck.hold(g.id);
		card.z.set(z);
		if (!caught) {
			binding.current?.scatter();
			pull.jump(0);
			const bound = bindDeck(deck, g.id, axis, pull, {
				threshold: knobs.threshold,
				curve: knobs.collapseCurve,
				opacity: knobs.dismissOpacity,
				/* the Deck's own settle, carried on: settle scales px/s by slow-mo */
				settle: (value, to, velocity) =>
					settle(
						value,
						to,
						SPRINGS.settle,
						motion,
						velocity / motion.timeScale,
					),
			});
			binding.current = bound;
			setAnchor(bound.anchor);
			values.flood.jump(0);
			values.lock.jump(0);
			values.pop.jump(1);
			values.fade.jump(1);
			setArmed(false);
		}
		setHeld(g.id);
		readouts.set({ phase: "carrying" });
	}

	/** Moves the pull to the hand, then shows what a release would do. */
	function move(g: Gesture, axis: Axis, drag: Drag) {
		const hand =
			g.start + takeUp(along(axis, drag).raw, g.slop, knobs.takeUp);
		const end =
			axis === "inline" ? g.slot.w * g.slot.s : g.slot.h * g.slot.s;
		const sign = hand < 0 ? -1 : 1;
		pull.set(sign * travelOf(Math.abs(hand), end, knobs.rubberLimit));
		const verdict = verdictOf(axis, pull.get(), knobs.threshold);
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
			zone: `${verdict.zone} · ${verdict.commits ? "will commit" : verdict.reason}`,
			velocity: { x: drag.vx, y: drag.vy },
			tilt: 0,
		});
	}

	/**
	 * Short of the threshold: the pull springs home, keeping the hand's
	 * speed, and takes the Card and the folded Deck with it. Reduced, the
	 * spring is critically damped and starts at rest, so it never overshoots.
	 */
	async function putBack(g: Gesture, speed: number) {
		const k = knobs.reducedReturnStiffness;
		const spec = motion.reduce
			? { stiffness: k, damping: 2 * Math.sqrt(k) }
			: SPRINGS.settle;
		await Promise.all([
			animate(
				pull,
				0,
				transition(spec, motion, motion.reduce ? 0 : speed * 1000),
			),
			settle(deck.valuesOf(g.id).lift, 0, SPRINGS.settle, motion),
		]);
		if (gen.current !== g.gen) return;
		binding.current?.stop();
		binding.current = null;
		deck.release(g.id);
		setPanel(null);
		setPressed(null);
		readouts.set({ phase: "rest" });
	}

	/**
	 * The folded Deck leaves as one: it carries on the way the hand went,
	 * at the hand's speed, and slows to a stop within `driftPx`, while the
	 * layer it is drawn in fades out evenly in `exitFadeMs`. The drift is a
	 * critically damped spring whose rate is the hand's speed over the
	 * distance it covers: an exponential decay from that speed, which
	 * never overshoots. Its time constant is a third of the fade, or
	 * shorter where the hand was fast enough to carry the Deck further
	 * than `driftPx`. A hand at rest or turned back carries nothing on;
	 * reduced, the Deck only fades.
	 */
	async function vanish(axis: Axis, sign: -1 | 1, speed: number) {
		const fade = animate(
			deck.opacity,
			0,
			transition({ ms: knobs.exitFadeMs, ease: EVEN }, motion),
		);
		const key = axis === "inline" ? "u" : "v";
		/* px/s the way the Card went */
		const way = Math.max(0, speed * sign) * 1000;
		const drifts =
			motion.reduce || way === 0 || knobs.driftPx <= 0
				? []
				: (() => {
						const rate = Math.max(
							3000 / Math.max(1, knobs.exitFadeMs),
							way / knobs.driftPx,
						);
						const spec = {
							stiffness: rate * rate,
							damping: 2 * rate,
						};
						return deck.order.map((id) => {
							const value = deck.valuesOf(id)[key];
							const to = value.get() + (sign * way) / rate;
							return settle(value, to, spec, motion, sign * way);
						});
					})();
		await fade;
		/* faded out, the rest of the drift would show nothing */
		for (const drift of drifts) drift.stop();
	}

	/**
	 * At it: the panel fades as the Card opens, or as the Card and the Deck
	 * folded onto it leave as one: the fold is whole there, and the other
	 * Cards, which just finished it, would otherwise part from the Card.
	 * The Card opens in a straight line from where the hand let go, so a
	 * swipe toward inline-end never carries it further that way first.
	 */
	async function commit(
		g: Gesture,
		axis: Axis,
		verdict: Verdict,
		speed: number,
	) {
		binding.current?.stop();
		binding.current = null;
		/* the Deck is leaving or open, and neither lights a Card */
		setPressed(null);
		animate(
			values.fade,
			0,
			transition(
				{ ms: motion.reduce ? REDUCED_EXIT_MS : knobs.panelFadeMs },
				motion,
			),
		);
		if (verdict.zone === "expand") {
			await deck.expand(
				g.id,
				axis === "inline" ? { u: speed, v: 0 } : { u: 0, v: speed },
			);
			if (gen.current === g.gen) setPanel(null);
			return;
		}
		const sign = pull.get() < 0 ? -1 : 1;
		await deck.leave(() => vanish(axis, sign, speed));
		setPanel(null);
	}

	/** The release reads the very value the panel was showing, at the hand's last spot. */
	function release(g: Gesture, drag: Drag | null) {
		const axis = g.axis;
		if (!axis) return;
		if (drag) move(g, axis, drag);
		const verdict: Verdict = drag
			? verdictOf(axis, pull.get(), knobs.threshold)
			: {
					commits: false,
					zone: zoneOf(axis, pull.get()),
					reason: "cancelled",
				};
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
		const speed = drag ? along(axis, drag).speed : 0;
		if (verdict.commits) void commit(g, axis, verdict, speed);
		else void putBack(g, speed);
	}

	function onDown(id: string, event: ReactPointerEvent<HTMLElement>) {
		const slot = deck.slotOf(id);
		if (deck.status !== "dealt" || !slot) return;
		const bound = binding.current;
		const caught = bound?.lead === id && Math.abs(pull.get()) > 0.5;
		if (bound && !caught) {
			bound.scatter();
			binding.current = null;
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
			commits: false,
		};
		/* the press puts out the hovered Card's border */
		setPressed(id);
		settle(card.lift, knobs.pressLift, SPRINGS.settle, motion);
		readouts.set({ phase: "pressed" });
		if (bound && caught) {
			/* caught on its way back: the hand takes it where it is, on its axis */
			pull.stop();
			g.axis = bound.axis;
			g.start = pull.get();
			g.commits = verdictOf(bound.axis, g.start, knobs.threshold).commits;
			begin(g, bound.axis, true);
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
					begin(g, g.axis, false);
				}
				move(g, g.axis, drag);
			},
			up: (drag) => {
				if (g.axis) {
					release(g, drag);
					return;
				}
				settle(card.lift, 0, SPRINGS.settle, motion);
				setPressed(null);
				readouts.set({ phase: "rest" });
				tapCard(deck, taps, id, drag);
			},
			cancel: () => {
				if (g.axis) {
					release(g, null);
					return;
				}
				settle(card.lift, 0, SPRINGS.settle, motion);
				setPressed(null);
			},
		});
	}

	const index = panel ? deck.order.indexOf(panel.id) : -1;
	const box = panel
		? panelBox(deck.slots, index, panel, knobs.panelInset, anchor)
		: null;
	const owner = panel ? deck.valuesOf(panel.id) : null;
	/* the panel is in the Deck's layer too, under the Cards in front of
	   its Card: faded with them, it never shows through one */
	return (
		<DeckLayer opacity={deck.opacity}>
			{panel && box && owner && deck.status !== "gone" ? (
				<SwipePanel
					key={`${panel.id}-${panel.axis}`}
					panel={panel}
					rect={box.rect}
					visible={box.visible}
					position={panel.axis === "inline" ? owner.u : owner.v}
					base={panel.axis === "inline" ? anchor.u : anchor.v}
					z={owner.z}
					values={values}
					armed={armed}
					threshold={knobs.threshold}
					tint={knobs.tint}
					labels={knobs.panelLabels && box.visible >= LABEL_ROOM_PX}
					rtl={rtl}
					reduce={motion.reduce}
				/>
			) : null}
			<DeckCards
				deck={deck}
				rtl={rtl}
				held={held}
				highlight={pressed === null && deck.status === "dealt"}
				onDown={onDown}
			/>
		</DeckLayer>
	);
}
