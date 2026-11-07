import { animationFrames } from "../animation-frames";
import type { Card } from "../card";
import type { Deck } from "../deck";
import type { Next } from "../queue";
import { translate } from "../translate";

/** `deck.intro()`: drops the Cards face up onto the Deck, then turns them. */
export const intro = {
	deck: (deck: Deck) => {
		deck.intro = deck.queued(intro);

		function intro(next: Next) {
			const cards = deck.cards;

			cards.forEach((card, i) => {
				card.setSide("front");
				card.intro(i, (i) => {
					animationFrames(250, 0).start(() => {
						card.setSide("back");
					});
					if (i === cards.length - 1) {
						next();
					}
				});
			});
		}
	},
	card: (card: Card) => {
		const $el = card.$el;

		card.intro = (i, cb) => {
			const delay = 500 + i * 10;
			const z = i / 4;

			$el.style.transform = translate(`${-z}px`, "-250px");
			$el.style.opacity = "0";

			card.x = -z;
			card.y = -250 - z;
			card.rot = 0;

			card.animateTo({
				delay,
				duration: 1000,

				x: -z,
				y: -z,

				onStart: () => {
					$el.style.zIndex = String(i);
				},
				onProgress: (t) => {
					$el.style.opacity = String(t);
				},
				onComplete: () => {
					$el.style.opacity = "";
					cb?.(i);
				},
			});
		};
	},
};
