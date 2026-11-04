import type { createTapCounter, Drag } from "./pointer";
import type { Deck } from "./use-deck";

/** A tap brings a Card to the front; a second within 350 ms and 10 px expands it. */
export function tapCard(
	deck: Deck,
	taps: ReturnType<typeof createTapCounter>,
	id: string,
	drag: Drag,
) {
	if (taps(id, drag.clientX, drag.clientY) === 2) {
		void deck.expand(id);
		return;
	}
	deck.release(id);
	deck.bringToFront(id);
}
