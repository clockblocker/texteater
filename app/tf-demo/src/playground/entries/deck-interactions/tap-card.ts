import type { createTapCounter, Drag } from "./pointer";
import { PULL_OUTS, type PullOut, SIDES, type Side } from "./tap-shuffle";
import type { Deck } from "./use-deck";

/**
 * The tap's knobs, shared by every variant: how far and which way the
 * tapped Card slides out as it is shuffled to the front. "20–60 px" is
 * deck-of-cards' own reach, made for 62 px Cards; "off" restacks at once
 * and lets the reflow take the Cards there, as before. `tapMs` is the
 * whole shuffle's length (deck-of-cards' is 400 ms); at 0 the Cards are
 * put in their new places at once, with no motion.
 */
export const TAP_DEFAULTS = {
	tapPullOut: "½ card" as PullOut,
	tapSide: "inline-end" as Side,
	tapMs: 0,
};
export type TapKnobs = typeof TAP_DEFAULTS;

/** The tap's inspector controls, to spread into a variant's knobs. */
export const TAP_KNOBS = [
	{
		kind: "choice" as const,
		key: "tapPullOut" as const,
		label: "Tap shuffle pull-out",
		options: PULL_OUTS,
	},
	{
		kind: "choice" as const,
		key: "tapSide" as const,
		label: "Tap shuffle side",
		options: SIDES,
	},
	{
		kind: "number" as const,
		key: "tapMs" as const,
		label: "Tap shuffle duration",
		min: 0,
		max: 800,
		step: 10,
		unit: "ms",
	},
];

/**
 * A tap brings a Card to the front, shuffled there as `knobs` say; a
 * second within 350 ms and 10 px opens the Card the first was on.
 */
export function tapCard(
	deck: Deck,
	taps: ReturnType<typeof createTapCounter>,
	id: string,
	drag: Drag,
	knobs: TapKnobs,
) {
	const opens = taps(id, drag.clientX, drag.clientY);
	if (opens !== null) {
		void deck.expand(opens);
		return;
	}
	deck.release(id);
	deck.bringToFront(id, {
		pullOut: knobs.tapPullOut,
		side: knobs.tapSide,
		ms: knobs.tapMs,
	});
}
