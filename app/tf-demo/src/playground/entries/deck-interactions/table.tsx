import { type PointerEvent as ReactPointerEvent, useState } from "react";
import { DeckCards, type VariantProps } from "./deck-cards";
import type { TableKnobs } from "./knobs";
import { pileSlots } from "./layout";
import { createTapCounter, framePoint, SLOP_PX, trackPointer } from "./pointer";
import { useTableCarry } from "./table-carry";
import { tapCard } from "./tap-card";
import { useDeck } from "./use-deck";
import { useDeckHover } from "./use-deck-hover";
import { DUMMY_DECK } from "./words";

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
	const deck = useDeck({
		cards: DUMMY_DECK,
		frame,
		motion,
		readouts,
		deal,
		layout: pileSlots,
	});
	const table = useTableCarry({ deck, frame, rtl, motion, readouts, knobs });
	const [pressed, setPressed] = useState<string | null>(null);
	const [taps] = useState(() => createTapCounter());
	const hover = useDeckHover({
		deck,
		motion,
		knobs,
		holding: pressed ?? table.held,
	});

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
		const pressScale = card.s.get();
		let lifted = false;
		setPressed(id);
		table.press(id);
		readouts.set({ phase: "pressed" });
		trackPointer(event, rtl, {
			move: (drag) => {
				if (!lifted && Math.hypot(drag.dx, drag.dy) < SLOP_PX) return;
				if (!lifted) {
					hover.clear();
					table.pickUp(id, grab, pressScale);
				}
				lifted = true;
				table.carry(
					id,
					{ u: start.u + drag.du, v: start.v + drag.dy },
					drag,
				);
			},
			up: (drag) => {
				setPressed(null);
				if (lifted)
					void table.drop(
						id,
						{ u: start.u + drag.du, v: start.v + drag.dy },
						drag,
					);
				else {
					readouts.set({ phase: "rest" });
					table.unpress(id);
					tapCard(deck, taps, id, drag);
				}
			},
			cancel: () => {
				setPressed(null);
				table.cancel(id);
			},
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
				onEnter={hover.onEnter}
				onLeave={hover.onLeave}
			/>
		</>
	);
}
