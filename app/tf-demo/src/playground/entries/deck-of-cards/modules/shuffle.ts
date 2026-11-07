import type { Card } from "../card";
import type { Deck } from "../deck";
import { fisherYates } from "../fisher-yates";
import { getFontSize } from "../font-size";
import { plusMinus } from "../plusminus";
import type { Next } from "../queue";

let fontSize: number;

/** `deck.shuffle()`: reorders `deck.cards`, sliding each Card out and back. */
export const shuffle = {
	deck: (deck: Deck) => {
		deck.shuffle = deck.queued(shuffle);

		function shuffle(next: Next) {
			const cards = deck.cards;

			fontSize = getFontSize();

			fisherYates(cards);

			cards.forEach((card, i) => {
				card.pos = i;

				card.shuffle((i) => {
					if (i === cards.length - 1) {
						next();
					}
				});
			});
		}
	},

	card: (card: Card) => {
		const $el = card.$el;

		card.shuffle = (cb) => {
			const i = card.pos;
			const z = i / 4;
			const delay = i * 2;

			card.animateTo({
				delay,
				duration: 200,

				x: (plusMinus(Math.random() * 40 + 20) * fontSize) / 16,
				y: -z,
				rot: 0,
			});
			card.animateTo({
				delay: 200 + delay,
				duration: 200,

				x: -z,
				y: -z,
				rot: 0,

				onStart: () => {
					$el.style.zIndex = String(i);
				},

				onComplete: () => {
					cb(i);
				},
			});
		};
	},
};
