import { motionValue } from "motion/react";
import { type PointerEvent as ReactPointerEvent, useState } from "react";
import { DeckCards, type VariantProps } from "./deck-cards";
import {
	detentOffset,
	FLICK_TRAVEL_PX,
	PROJECTION_MS,
	type Slot,
} from "./geometry";
import type { SwipeKnobs } from "./knobs";
import { pileSlots } from "./layout";
import { SPRINGS } from "./motion-kit";
import { createTapCounter, type Drag, trackPointer } from "./pointer";
import { tapCard } from "./stack";
import { type Panel, SwipePanel } from "./swipe-panel";
import { useDeck } from "./use-deck";

type Axis = Panel["axis"];

function along(axis: Axis, drag: Drag) {
	return axis === "inline"
		? { raw: drag.du, speed: drag.vu }
		: { raw: drag.dy, speed: drag.vy };
}

/** Which action a move along `axis` by `raw` px uncovers. */
function panelFor(id: string, axis: Axis, raw: number): Panel {
	const sign = raw < 0 ? -1 : 1;
	const dismiss = axis === "inline" ? sign < 0 : sign > 0;
	return { id, axis, sign, zone: dismiss ? "dismiss" : "expand" };
}

/**
 * D, Swipe actions: the Card slides on one axis only and uncovers an
 * action under it, as iOS Mail's rows do. Past the detent a release
 * commits; short of it the Card returns. A flick commits whichever way.
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
	const [past, setPast] = useState(false);
	const [progress] = useState(() => motionValue(0));
	const [taps] = useState(() => createTapCounter());

	function move(id: string, slot: Slot, axis: Axis, drag: Drag) {
		const card = deck.valuesOf(id);
		const { raw } = along(axis, drag);
		const shown = motion.reduce
			? raw
			: detentOffset(raw, knobs.detent, knobs.resistance);
		if (axis === "inline") card.u.set(slot.u + shown);
		else card.v.set(slot.v + shown);
		const next = panelFor(id, axis, raw);
		setPanel((current) =>
			current?.zone === next.zone && current.sign === next.sign
				? current
				: next,
		);
		const beyond = Math.abs(raw) >= knobs.detent;
		setPast(beyond);
		progress.set(Math.min(1, Math.abs(raw) / knobs.detent));
		readouts.set({
			zone: beyond
				? next.zone
				: `back (${next.zone} at ${knobs.detent.toString()})`,
			velocity: { x: drag.vx, y: drag.vy },
			tilt: 0,
		});
	}

	async function release(id: string, axis: Axis, drag: Drag) {
		const { raw, speed } = along(axis, drag);
		const ahead = raw + speed * PROJECTION_MS;
		const flick =
			Math.abs(speed) >= knobs.flickSpeed &&
			Math.abs(raw) >= FLICK_TRAVEL_PX;
		const commits = flick || Math.abs(ahead) >= knobs.detent;
		const action = panelFor(id, axis, flick ? speed : ahead);
		const velocity = { u: drag.vu, v: drag.vy };
		setHeld(null);
		readouts.set({
			phase: "settling",
			zone: null,
			outcome: commits
				? `${action.zone} · ${flick ? `flick ${Math.abs(speed).toFixed(2)}` : `detent ${Math.round(Math.abs(ahead)).toString()}`}`
				: `back · short ${Math.round(Math.abs(ahead)).toString()}`,
		});
		if (!commits) {
			await deck.putBack(id, SPRINGS.settle, velocity);
			setPanel(null);
			readouts.set({ phase: "rest" });
			return;
		}
		if (action.zone === "expand") {
			setPanel(null);
			await deck.expand(id, velocity);
			return;
		}
		const direction =
			axis === "inline"
				? { u: action.sign, v: 0 }
				: { u: 0, v: action.sign };
		await deck.dismiss({ direction, lead: id, stagger: 40, velocity });
		setPanel(null);
	}

	function onDown(id: string, event: ReactPointerEvent<HTMLElement>) {
		const slot = deck.slotOf(id);
		if (deck.status !== "dealt" || !slot) return;
		let axis: Axis | null = null;
		readouts.set({ phase: "pressed" });
		trackPointer(event, rtl, {
			move: (drag) => {
				if (!axis && Math.hypot(drag.dx, drag.dy) < knobs.axisLock)
					return;
				if (!axis) {
					axis =
						Math.abs(drag.du) >= Math.abs(drag.dy)
							? "inline"
							: "block";
					deck.hold(id);
					setHeld(id);
					readouts.set({ phase: "carrying" });
				}
				move(id, slot, axis, drag);
			},
			up: (drag) => {
				if (axis) void release(id, axis, drag);
				else {
					readouts.set({ phase: "rest" });
					tapCard(deck, taps, id, drag);
				}
			},
			cancel: () => {
				setHeld(null);
				setPanel(null);
				void deck.putBack(id);
			},
		});
	}

	const panelSlot = panel ? deck.slotOf(panel.id) : undefined;
	return (
		<>
			{panel && panelSlot && deck.status !== "gone" ? (
				<SwipePanel
					panel={panel}
					rect={panelSlot}
					progress={progress}
					past={past}
					labels={knobs.panelLabels}
					motion={motion}
				/>
			) : null}
			<DeckCards deck={deck} rtl={rtl} held={held} onDown={onDown} />
		</>
	);
}
