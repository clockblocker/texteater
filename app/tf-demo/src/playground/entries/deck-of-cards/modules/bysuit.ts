import type { Card } from "../card";
import type { Deck } from "../deck";
import { getFontSize } from "../font-size";
import type { Next } from "../queue";

let fontSize: number;

/** `deck.bysuit()`: four rows, one per suit, each from ace to king. */
export const bysuit = {
	deck: (deck: Deck) => {
		deck.bysuit = deck.queued(bysuit);

		function bysuit(next: Next) {
			const cards = deck.cards;

			fontSize = getFontSize();

			cards.forEach((card) => {
				card.bysuit((i) => {
					if (i === cards.length - 1) {
						next();
					}
				});
			});
		}
	},
	card: (card: Card) => {
		const rank = card.rank;
		const suit = card.suit;

		card.bysuit = (cb) => {
			const i = card.i;
			const delay = i * 10;

			card.animateTo({
				delay,
				duration: 400,

				x: -Math.round(((6.75 - rank) * 8 * fontSize) / 16),
				y: -Math.round(((1.5 - suit) * 92 * fontSize) / 16),
				rot: 0,

				onComplete: () => {
					cb(i);
				},
			});
		};
	},
};
