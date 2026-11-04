import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useState,
} from "react";
import { DeckCards, type VariantProps } from "./deck-cards";
import type { TableKnobs } from "./knobs";
import { fanSlots, pileSlots } from "./layout";
import { SPRINGS } from "./motion-kit";
import { createTapCounter, framePoint, SLOP_PX, trackPointer } from "./pointer";
import { tapCard } from "./stack";
import { useTableCarry } from "./table-carry";
import { useDeck } from "./use-deck";

/**
 * B, Table: zones are places. Under the pointer the Deck fans and the
 * hovered Card lifts; a Card picked up trails the hand, and the slot it
 * left, the tray and the open pad appear. Letting go over one is what it
 * does; over nothing is back, along an arc.
 */
export function TableVariant({
	frame,
	rtl,
	motion,
	readouts,
	knobs,
	deal,
}: VariantProps<TableKnobs>) {
	const deck = useDeck({ frame, motion, readouts, deal, layout: pileSlots });
	const table = useTableCarry({ deck, frame, rtl, motion, readouts, knobs });
	const [hovered, setHovered] = useState<string | null>(null);
	const [taps] = useState(() => createTapCounter());

	/* the fan: every Card turned around the Deck's foot, the hovered one lifted */
	const { order, slots, status, expanded, place, isBusy } = deck;
	const { held } = table;
	useEffect(() => {
		if (held || status !== "dealt" || expanded) return;
		const fanned =
			hovered && !motion.reduce ? fanSlots(slots, knobs.fanDeg) : slots;
		order.forEach((id, index) => {
			const slot = fanned[index];
			if (!slot || isBusy(id)) return;
			const lift = id === hovered ? knobs.hoverLift : 0;
			void place(id, { ...slot, v: slot.v - lift }, SPRINGS.reflow);
		});
	}, [
		hovered,
		held,
		status,
		expanded,
		order,
		slots,
		place,
		isBusy,
		motion.reduce,
		knobs.fanDeg,
		knobs.hoverLift,
	]);

	function onDown(id: string, event: ReactPointerEvent<HTMLElement>) {
		if (deck.status !== "dealt") return;
		const card = deck.valuesOf(id);
		const start = { u: card.u.get(), v: card.v.get() };
		const at = framePoint(
			event.currentTarget,
			event.clientX,
			event.clientY,
			rtl,
		);
		const grab = { u: at.u - start.u, v: at.v - start.v };
		let lifted = false;
		readouts.set({ phase: "pressed" });
		trackPointer(event, rtl, {
			move: (drag) => {
				if (!lifted && Math.hypot(drag.dx, drag.dy) < SLOP_PX) return;
				if (!lifted) {
					setHovered(null);
					table.pickUp(id, grab);
				}
				lifted = true;
				table.carry(
					id,
					{ u: start.u + drag.du, v: start.v + drag.dy },
					drag,
				);
			},
			up: (drag) => {
				if (lifted)
					void table.drop(
						id,
						{ u: start.u + drag.du, v: start.v + drag.dy },
						drag,
					);
				else {
					readouts.set({ phase: "rest" });
					tapCard(deck, taps, id, drag);
				}
			},
			cancel: () => table.cancel(id),
		});
	}

	return (
		<>
			{table.view}
			<DeckCards
				deck={deck}
				rtl={rtl}
				held={table.held}
				onDown={onDown}
				onEnter={(id, event) => {
					if (event.pointerType === "mouse" && !table.held)
						setHovered(id);
				}}
				onLeave={(id) =>
					setHovered((current) => (current === id ? null : current))
				}
			/>
		</>
	);
}
