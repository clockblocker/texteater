import type { Card } from "../card";
import type { Deck } from "../deck";
import { getFontSize } from "../font-size";
import type { Next } from "../queue";

let fontSize: number;

/** `deck.fan()`: gathers the Deck, then spreads it over 260° around its centre. */
export const fan = {
	deck: (deck: Deck) => {
		deck.fan = deck.queued(fan);

		function fan(next: Next) {
			const cards = deck.cards;
			const len = cards.length;

			fontSize = getFontSize();

			cards.forEach((card, i) => {
				card.fan(i, len, (i) => {
					if (i === cards.length - 1) {
						next();
					}
				});
			});
		}
	},
	card: (card: Card) => {
		const $el = card.$el;

		card.fan = (i, len, cb) => {
			const z = i / 4;
			const delay = i * 10;
			const rot = (i / (len - 1)) * 260 - 130;

			card.animateTo({
				delay,
				duration: 300,

				x: -z,
				y: -z,
				rot: 0,
			});
			card.animateTo({
				delay: 300 + delay,
				duration: 300,

				x: (Math.cos(deg2rad(rot - 90)) * 55 * fontSize) / 16,
				y: (Math.sin(deg2rad(rot - 90)) * 55 * fontSize) / 16,
				rot,

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

function deg2rad(degrees: number) {
	return (degrees * Math.PI) / 180;
}
