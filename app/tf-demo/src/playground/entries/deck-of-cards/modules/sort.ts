import type { Card } from "../card";
import type { Deck } from "../deck";
import type { Next } from "../queue";

/** `deck.sort(reverse?)`: orders `deck.cards` by `i`, lifting and restacking. */
export const sort = {
	deck: (deck: Deck) => {
		deck.sort = deck.queued(sort);

		function sort(next: Next, reverse?: boolean) {
			const cards = deck.cards;

			cards.sort((a, b) => {
				if (reverse) {
					return a.i - b.i;
				} else {
					return b.i - a.i;
				}
			});

			cards.forEach((card, i) => {
				card.sort(
					i,
					cards.length,
					(i) => {
						if (i === cards.length - 1) {
							next();
						}
					},
					reverse,
				);
			});
		}
	},
	card: (card: Card) => {
		const $el = card.$el;

		card.sort = (i, _len, cb, _reverse) => {
			const z = i / 4;
			const delay = i * 10;

			card.animateTo({
				delay,
				duration: 400,

				x: -z,
				y: -150,
				rot: 0,

				onComplete: () => {
					$el.style.zIndex = String(i);
				},
			});

			card.animateTo({
				delay: delay + 500,
				duration: 400,

				x: -z,
				y: -z,
				rot: 0,

				onComplete: () => {
					cb(i);
				},
			});
		};
	},
};
