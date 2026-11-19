import { animate, motionValue } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { DeckCards, DeckLayer, type VariantProps } from "./deck-cards";
import { drawn, type Slot } from "./geometry";
import { otherCoverRect, panesOf, pileSlots } from "./layout";
import { REDUCED_EXIT_MS, SPRINGS, settle, transition } from "./motion-kit";
import { OtherPane } from "./other-pane";
import { createTapCounter, type Drag, trackPointer } from "./pointer";
import { type Anchor, type Binding, bindDeck } from "./swipe-collapse";
import {
	type Axis,
	releaseVerdictOf,
	takeUp,
	travelOf,
	type Verdict,
	verdictOf,
	zoneOf,
} from "./swipe-gesture";
import type { SwipeKnobs } from "./swipe-knobs";
import {
	type Panel,
	type PanelBox,
	type PanelValues,
	type Strip,
	SwipePanel,
} from "./swipe-panel";
import { tapCard } from "./tap-card";
import { useDeck } from "./use-deck";

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
	axis: Axis | null;
	/** The slop the hand moved to lock the axis; 0 when the Card was caught moving. */
	slop: number;
	/** The Card's offset along the axis when the hand took it. */
	start: number;
	commits: boolean;
};

/**
 * A panel let go on Open or the other Pane: its box, its stacking and
 * its anchor as they were drawn when the hand let go, held still, and how
 * much of it the Card had uncovered then, in px.
 */
type Kept = {
	readonly box: PanelBox;
	readonly anchor: Anchor;
	readonly uncovered: number;
};

function along(axis: Axis, drag: Drag) {
	return axis === "inline"
		? { raw: drag.du, speed: drag.vu }
		: { raw: drag.dy, speed: drag.vy };
}

/**
 * Which strip of a swiped Card shows while its panel shows, in px from
 * its slot's drawn top: null where all of it does.
 * The panel is always the Card's whole box and shares its z-index, so the
 * Cards stacked over it hide it as they hide the Card: those nearer the
 * open Card. Across the block axis all of the Card's width shows. Across
 * the inline axis, toward Close deck, they come onto the Card and uncover
 * its box as they go, so its icon sits in its middle, as on the open
 * Card; toward Open or the other Pane they stay put. A Card folded above
 * the open one shows only its strip above the next Card, and one folded
 * below it only its strip under the Card before: its icon sits in that
 * strip.
 */
function showsOf(
	slots: readonly Slot[],
	index: number,
	openAt: number,
	panel: Panel,
): Strip | null {
	const slot = slots[index];
	if (!slot || panel.axis !== "inline" || panel.zone === "dismiss")
		return null;
	const own = drawn(slot);
	if (index < openAt) {
		const next = slots[index + 1];
		if (!next) return null;
		return { from: 0, size: Math.max(0, drawn(next).v - own.v) };
	}
	if (index > openAt) {
		const before = slots[index - 1];
		if (!before) return null;
		const covered = drawn(before);
		const from = Math.max(0, covered.v + covered.h - own.v);
		return { from, size: Math.max(0, own.h - from) };
	}
	return null;
}

/**
 * D, Swipe actions, as iOS Mail's full swipe: the Card slides on one axis
 * and uncovers an action under it, and toward Close deck the rest of the
 * Deck folds onto it, whichever Card it is, the Cards before it coming
 * down and the ones after it coming up, each keeping its place in the
 * stack. Every Card takes every swipe the open one does,
 * along either axis. One value, the pull, drives all of it, and one
 * threshold is the breakpoint: there the Deck is whole, the colour floods
 * in, the icon is whole and stays put while the Card goes on, and a
 * release commits. Short of it, a release brings everything back, unless
 * "Flick commits" is on and the hand was going fast enough the way it
 * pulled to have reached it: then the colour floods in as it lets go. The
 * Deck itself never moves on hover: the Card under the pointer only
 * lights its border. On a wide screen the Deck rests in its own Pane, and
 * a swipe toward inline-end opens the Card in the other Pane beside it,
 * the way Open opens it into the Cover; on a phone it opens the Cover.
 */
export function SwipeVariant({
	cards,
	frame,
	rtl,
	motion,
	readouts,
	knobs,
	deal,
	width,
}: VariantProps<SwipeKnobs>) {
	/* the Deck rests in its own Pane; on a wide screen the other is beside it */
	const panes = useMemo(
		() => panesOf(frame, width, knobs.otherPaneShare),
		[frame, width, knobs.otherPaneShare],
	);
	const deck = useDeck({
		cards,
		frame: panes.deck,
		motion,
		readouts,
		deal,
		layout: pileSlots,
		close: knobs,
		narrow: width === "phone",
	});
	const [held, setHeld] = useState<string | null>(null);
	/** The Card under the hand from press to the end of its return: no Card lights meanwhile. */
	const [pressed, setPressed] = useState<string | null>(null);
	const [panel, setPanel] = useState<Panel | null>(null);
	const [anchor, setAnchor] = useState<Anchor | null>(null);
	const [kept, setKept] = useState<Kept | null>(null);
	const [armed, setArmed] = useState(false);
	const [values] = useState<PanelValues>(() => ({
		flood: motionValue(0),
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
		/* the Card keeps its place in the pile: one other than the open one
		   slides out from between its neighbours, over its panel and under
		   the Cards stacked over it; a close ends where every Card shows */
		deck.hold(g.id);
		card.z.set(deck.restZ(g.id));
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
		const verdict = verdictOf(axis, pull.get(), knobs.threshold, width);
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
	 * reduced, the Deck only fades. A Card open in the other Pane was not
	 * in the fold and stays put there while it fades with the layer.
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
						const folded = deck.order.filter(
							(id) => id !== deck.beside,
						);
						return folded.map((id) => {
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
	 * The panel as the hand leaves it: the Card's box and stacking and the
	 * anchor as last drawn, held still, and how far the Card had uncovered
	 * it. A move not drawn yet stays undrawn, so this is what showed.
	 */
	function keep(id: string, axis: Axis, from: Anchor): Kept {
		const card = deck.valuesOf(id);
		const box = {
			u: motionValue(card.u.get()),
			v: motionValue(card.v.get()),
			w: motionValue(card.w.get()),
			h: motionValue(card.h.get()),
			s: motionValue(card.s.get()),
			z: motionValue(card.z.get()),
		};
		const at = { u: from.u.get(), v: from.v.get() };
		return {
			box,
			anchor: { u: motionValue(at.u), v: motionValue(at.v) },
			uncovered: Math.abs(
				axis === "inline" ? box.u.get() - at.u : box.v.get() - at.v,
			),
		};
	}

	/**
	 * At it: the panel fades as the Card opens, here or in the other Pane,
	 * or as the Card and the Deck
	 * folded onto it leave as one: the fold is whole there, and the other
	 * Cards, which just finished it, would otherwise part from the Card.
	 * The Card opens in a straight line from where the hand let go, so a
	 * swipe toward inline-end never carries it further that way first.
	 * Toward Open the panel stays where the hand let go, at the Card's place
	 * in the Deck, cut to the strip the Card had uncovered: what the Card
	 * still covered goes in that frame, before the Card can uncover it, and
	 * the Card, opening into the Cover, which holds its slot, comes back
	 * over the strip while it fades. Left to the Card's values, the panel
	 * would rise over the Deck with it and stretch toward the Cover. The
	 * rest of the Deck, which fades out under the Cover, waits for the
	 * panel to go first, so it never uncovers it.
	 */
	async function commit(
		g: Gesture,
		axis: Axis,
		verdict: Verdict,
		speed: number,
	) {
		const bound = binding.current;
		bound?.stop();
		binding.current = null;
		/* the Deck is leaving or open, and neither lights a Card */
		setPressed(null);
		const fade = animate(
			values.fade,
			0,
			transition(
				{ ms: motion.reduce ? REDUCED_EXIT_MS : knobs.panelFadeMs },
				motion,
			),
		);
		if (verdict.zone !== "dismiss") {
			if (bound) setKept(keep(g.id, axis, bound.anchor));
			void fade.then(() => {
				if (gen.current !== g.gen) return;
				setPanel(null);
				setKept(null);
			});
			const velocity =
				axis === "inline" ? { u: speed, v: 0 } : { u: 0, v: speed };
			const into =
				verdict.zone === "other-pane" && panes.other
					? otherCoverRect(panes.other)
					: undefined;
			await deck.expand(g.id, velocity, into, fade.finished);
			return;
		}
		const sign = pull.get() < 0 ? -1 : 1;
		await deck.leave(() => vanish(axis, sign, speed));
		setPanel(null);
	}

	/** The release reads the very value the panel was showing, at the hand's last spot, and the hand's speed there if a flick counts. */
	function release(g: Gesture, drag: Drag | null) {
		const axis = g.axis;
		if (!axis) return;
		if (drag) move(g, axis, drag);
		const verdict: Verdict = drag
			? releaseVerdictOf(
					axis,
					pull.get(),
					along(axis, drag).speed,
					knobs.threshold,
					{ on: knobs.flickCommits, ms: knobs.flickMs },
					width,
				)
			: {
					commits: false,
					zone: zoneOf(axis, pull.get(), width),
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
		/* a press that does not catch the swiped Card on its way home ends
		   that swipe, and its panel goes with it: the hand uncovers it no
		   more, and a tap that opens its Card would rescale it off it */
		if (!caught) {
			setPanel(null);
			setKept(null);
		}
		if (bound && !caught) {
			bound.scatter();
			binding.current = null;
		}
		const card = deck.valuesOf(id);
		/* a Card a close is moving goes on moving under the press */
		const moving = deck.isPlaying(id);
		const g: Gesture = {
			id,
			slot,
			gen: ++gen.current,
			axis: null,
			slop: 0,
			start: 0,
			commits: false,
		};
		/* the press puts out the hovered Card's border */
		setPressed(id);
		if (!moving) settle(card.lift, knobs.pressLift, SPRINGS.settle, motion);
		readouts.set({ phase: "pressed" });
		if (bound && caught) {
			/* caught on its way back: the hand takes it where it is, on its axis */
			pull.stop();
			g.axis = bound.axis;
			g.start = pull.get();
			g.commits = verdictOf(
				bound.axis,
				g.start,
				knobs.threshold,
				width,
			).commits;
			begin(g, bound.axis, true);
		}
		trackPointer(event, rtl, {
			move: (drag) => {
				if (!g.axis) {
					if (Math.hypot(drag.dx, drag.dy) < knobs.axisLock) return;
					g.axis =
						Math.abs(drag.du) >= Math.abs(drag.dy)
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
				if (!moving) settle(card.lift, 0, SPRINGS.settle, motion);
				setPressed(null);
				readouts.set({ phase: "rest" });
				tapCard(deck, taps, id, drag);
			},
			cancel: () => {
				if (g.axis) {
					release(g, null);
					return;
				}
				if (!moving) settle(card.lift, 0, SPRINGS.settle, motion);
				setPressed(null);
			},
		});
	}

	const index = panel ? deck.order.indexOf(panel.id) : -1;
	const shows = panel ? showsOf(deck.slots, index, deck.openAt, panel) : null;
	/* the panel is in the Deck's layer too, under the Cards stacked over
	   its Card: faded with them, it never shows through one */
	return (
		<>
			<OtherPane
				pane={panes.other}
				holds={deck.beside !== null}
				motion={motion}
			/>
			<DeckLayer
				opacity={deck.opacity}
				lit={pressed === null && deck.status === "dealt"}
			>
				{panel && anchor && index >= 0 && deck.status !== "gone" ? (
					<SwipePanel
						key={`${panel.id}-${panel.axis}`}
						panel={panel}
						card={kept?.box ?? deck.valuesOf(panel.id)}
						anchor={kept?.anchor ?? anchor}
						shows={shows}
						kept={kept?.uncovered ?? null}
						values={values}
						armed={armed}
						threshold={knobs.threshold}
						tint={knobs.tint}
						labels={
							knobs.panelLabels &&
							(shows === null || shows.size >= LABEL_ROOM_PX)
						}
						rtl={rtl}
						reduce={motion.reduce}
					/>
				) : null}
				<DeckCards
					cards={cards}
					deck={deck}
					rtl={rtl}
					held={held}
					highlight
					onDown={onDown}
				/>
			</DeckLayer>
		</>
	);
}
