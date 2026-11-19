import type { createTapCounter, Drag } from "./pointer";
import type { Deck } from "./use-deck";

/**
 * A tap brings a Card to the front, at once and in its place, as tf-demo
 * opens a Card in its Deck; a second within 350 ms and 10 px opens the
 * Card the first was on.
 */
export function tapCard(
	deck: Deck,
	taps: ReturnType<typeof createTapCounter>,
	id: string,
	drag: Drag,
) {
	const opens = taps(id, drag.clientX, drag.clientY);
	if (opens !== null) {
		void deck.expand(opens);
		return;
	}
	deck.release(id);
	deck.bringToFront(id);
}
