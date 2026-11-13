import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { DISSOLVE_MS } from "./card-move";
import type { Rect } from "./geometry";
import { type MotionContext, transition } from "./motion-kit";
import type { Deck } from "./use-deck";

/** How long the stand-in Pane takes to come in as a Card opens in it, and to go as it closes. */
const PANE_FADE_MS = 160;

/**
 * Which Card is open in the other Pane: set as a swipe commits there, and
 * none once that Card's Cover closes, however it closes (its ×, its ←,
 * Escape). A Card opened into the Cover by other means is not in it.
 */
export function useOtherPane(deck: Pick<Deck, "expanded">) {
	const [held, setHeld] = useState<string | null>(null);
	useEffect(() => {
		if (deck.expanded === null) setHeld(null);
	}, [deck.expanded]);
	return {
		/** The Card open there, if one is. */
		holds: held !== null && deck.expanded === held ? held : null,
		open: setHeld,
	};
}

/**
 * The playground has no Panes, so this stands in for the other one: the
 * region at inline-end of the frame the Deck's own Pane leaves, drawn
 * only while it holds a Card, under the Deck's layer. It shows as a Pane
 * would beside another, by the line between them. It comes in as the
 * Card sets off for it and goes as the Card goes back.
 */
export function OtherPane({
	pane,
	holds,
	motion: context,
}: {
	readonly pane: Rect | null;
	readonly holds: boolean;
	readonly motion: MotionContext;
}) {
	const fade = transition(
		{ ms: context.reduce ? DISSOLVE_MS : PANE_FADE_MS },
		context,
	);
	return (
		<AnimatePresence>
			{pane && holds ? (
				<motion.div
					key="other-pane"
					aria-hidden="true"
					data-other-pane=""
					className="pointer-events-none absolute border-s border-line bg-canvas"
					style={{
						insetInlineStart: pane.u,
						top: pane.v,
						width: pane.w,
						height: pane.h,
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1, transition: fade }}
					exit={{ opacity: 0, transition: fade }}
				/>
			) : null}
		</AnimatePresence>
	);
}
