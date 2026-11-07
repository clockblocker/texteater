import type { Card } from "../card";
import type { Deck } from "../deck";
import { getFontSize } from "../font-size";
import type { Next } from "../queue";

let fontSize: number;

/** `deck.poker()`: deals the Deck's top five Cards face up in a row. */
export const poker = {
	deck: (deck: Deck) => {
		deck.poker = deck.queued(poker);

		function poker(next: Next) {
			const cards = deck.cards;
			const len = cards.length;

			fontSize = getFontSize();

			cards
				.slice(-5)
				.reverse()
				.forEach((card, i) => {
					card.poker(i, len, (i) => {
						card.setSide("front");
						if (i === 4) {
							next();
						}
					});
				});
		}
	},
	card: (card: Card) => {
		const $el = card.$el;

		card.poker = (i, len, cb) => {
			const delay = i * 250;

			card.animateTo({
				delay,
				duration: 250,

				x: Math.round(((i - 2.05) * 70 * fontSize) / 16),
				y: Math.round((-110 * fontSize) / 16),
				rot: 0,

				onStart: () => {
					$el.style.zIndex = String(len - 1 + i);
				},
				onComplete: () => {
					cb(i);
				},
			});
		};
	},
};
