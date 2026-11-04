import { animate, motionValue } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";
import { DeckCards, type VariantProps } from "./deck-cards";
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
import { useDeckHover } from "./use-deck-hover";

/** A strip panel tucks this far under the next Card, past its rounded corners. */
const TUCK_PX = 16;
const POP = { ms: 240 };
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
 * the hand took it (`anchor`, hover lift and all). It stays `inset` px
 * inside the Card's edges across the axis, past its rounded corners, so
 * only what the Card uncovers along the axis ever shows. For a Card
 * behind, it is the strip above the next Card, tucked under that Card.
 */
function panelBox(
	slots: readonly Slot[],
	index: number,
	axis: Axis,
	inset: number,
	anchor: { readonly u: number; readonly v: number },
) {
	const slot = slots[index];
	if (!slot) return null;
	const box = drawn({ ...slot, u: anchor.u, v: anchor.v });
	const next = slots[index + 1];
	if (next) {
		const visible = Math.max(0, drawn(next).v - box.v - inset);
		return {
			rect: { ...box, v: box.v + inset, h: visible + TUCK_PX },
			visible,
		};
	}
	const rect =
		axis === "inline"
			? { ...box, v: box.v + inset, h: box.h - 2 * inset }
			: { ...box, u: box.u + inset, w: box.w - 2 * inset };
	return { rect, visible: rect.h };
}

/**
 * D, Swipe actions, as iOS Mail's full swipe: the Card slides on one axis
 * and uncovers an action under it, and toward Close deck the rest of the
 * Deck folds into it. One value, the pull, drives all of it, and one
 * threshold is the breakpoint: there the Deck is whole, the colour floods
 * in, the icon locks to the Card's edge, and a release commits. Short of
 * it, a release brings everything back.
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
	/** The Card under the hand from press to the end of its return: the hover lets the Deck be meanwhile. */
	const [pressed, setPressed] = useState<string | null>(null);
	const hover = useDeckHover({ deck, motion, knobs, holding: pressed });
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
		/* a Card from behind the hover fanned stands up as it starts to slide;
		   its panel waits until it has */
		if (Math.abs(card.r.get()) > 0.01)
			settle(card.r, 0, SPRINGS.settle, motion);
		if (!caught) {
			binding.current?.scatter();
			pull.jump(0);
			const bound = bindDeck(deck, g.id, axis, pull, {
				threshold: knobs.threshold,
				curve: knobs.collapseCurve,
				/* the hover's own settle, carried on: settle scales px/s by slow-mo */
				settle: (value, to, velocity) =>
					settle(
						value,
						to,
						{
							stiffness: knobs.hoverStiffness,
							damping: knobs.hoverDamping,
						},
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
	 * Then the hover has the Deck again: fanned if the pointer is still on
	 * it, at rest if not.
	 */
	async function putBack(
		g: Gesture,
		speed: number,
		at: { readonly x: number; readonly y: number } | null,
	) {
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
		const over =
			at &&
			document
				.elementFromPoint(at.x, at.y)
				?.closest("[data-deck-frame] [data-card-id]");
		if (!over) hover.clear();
		readouts.set({ phase: "rest" });
	}

	/**
	 * At it: the panel fades as the Card opens, or as the Card and the Deck
	 * folded under it leave as one, at the hand's speed: the fold is whole
	 * there, and the Cards behind, which just finished it, would otherwise
	 * slide out from under the Card. The Card opens in a straight line
	 * from where the hand let go, so a swipe toward inline-end never
	 * carries it further that way first.
	 */
	async function commit(
		g: Gesture,
		axis: Axis,
		verdict: Verdict,
		speed: number,
	) {
		binding.current?.stop();
		binding.current = null;
		/* the Deck is leaving or open, and the hover lets either be */
		setPressed(null);
		animate(
			values.fade,
			0,
			transition(
				{ ms: motion.reduce ? REDUCED_EXIT_MS : knobs.panelFadeMs },
				motion,
			),
		);
		const velocity =
			axis === "inline" ? { u: speed, v: 0 } : { u: 0, v: speed };
		if (verdict.zone === "expand") {
			await deck.expand(g.id, velocity);
			if (gen.current === g.gen) setPanel(null);
			return;
		}
		const sign = pull.get() < 0 ? -1 : 1;
		await deck.dismiss({
			direction:
				axis === "inline" ? { u: sign, v: 0 } : { u: 0, v: sign },
			lead: g.id,
			stagger: 0,
			velocity,
			together: true,
		});
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
		else
			void putBack(
				g,
				speed,
				drag ? { x: drag.clientX, y: drag.clientY } : null,
			);
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
		/* the press turns the hover off: the rest of the Deck settles back */
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
		? panelBox(deck.slots, index, panel.axis, knobs.panelInset, anchor)
		: null;
	const owner = panel ? deck.valuesOf(panel.id) : null;
	return (
		<>
			{panel && box && owner && deck.status !== "gone" ? (
				<SwipePanel
					key={`${panel.id}-${panel.axis}`}
					panel={panel}
					rect={box.rect}
					visible={box.visible}
					position={panel.axis === "inline" ? owner.u : owner.v}
					base={panel.axis === "inline" ? anchor.u : anchor.v}
					z={owner.z}
					turn={owner.r}
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
				onDown={onDown}
				onEnter={hover.onEnter}
				onLeave={hover.onLeave}
			/>
		</>
	);
}
