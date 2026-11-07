import type { Side } from "../card";
import type { Deck } from "../deck";
import type { Next } from "../queue";

/**
 * `deck.flip(side?)`: turns every Card to `side`, or, without one, face down
 * when more than half are face up and face up otherwise.
 */
export const flip = {
	deck: (deck: Deck) => {
		deck.flip = deck.queued(flip);

		function flip(next: Next, side?: Side) {
			const flipped =
				deck.cards.filter((card) => card.side === "front").length /
				deck.cards.length;

			deck.cards.forEach((card) => {
				card.setSide(side ? side : flipped > 0.5 ? "back" : "front");
			});
			next();
		}
	},
};
