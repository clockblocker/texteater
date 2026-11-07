import { animationFrames } from "./animation-frames";
import { Card, type Side } from "./card";
import { deckModules } from "./deck-modules";
import { ease } from "./ease";
import { type Observable, observable } from "./observable";
import { type Queueable, queueable } from "./queue";
import { translate } from "./translate";

/**
 * A `div.deck` of 52 Cards, 55 with jokers. Its centre is the origin of
 * every Card's `x` and `y`, so mount it into a positioned, zero-size box.
 * Each action queues behind the ones before it.
 */
export type Deck = Observable &
	Queueable & {
		mount: (root: HTMLElement) => void;
		unmount: () => void;
		cards: Card[];
		$el: HTMLDivElement;
		// Added by `modules/*`.
		bysuit: () => void;
		fan: () => void;
		flip: (side?: Side) => void;
		intro: () => void;
		poker: () => void;
		shuffle: () => void;
		/** Highest card on top; `reverse` puts the lowest on top. */
		sort: (reverse?: boolean) => void;
	};

export function Deck(jokers?: boolean): Deck {
	// init cards array
	const cards: Card[] = new Array(jokers ? 55 : 52);

	const $el = document.createElement("div");
	const self = observable({ mount, unmount, cards, $el }) as Deck;
	let $root: HTMLElement;

	const modules = Deck.modules;

	// make queueable
	queueable(self);

	// load modules
	for (const module of Object.values(modules)) {
		module.deck?.(self);
	}

	// add class
	$el.classList.add("deck");

	// create cards
	for (let i = cards.length; i; i--) {
		const card = Card(i - 1);
		cards[i - 1] = card;
		card.setSide("back");
		card.mount($el);
	}

	return self;

	function mount(root: HTMLElement) {
		// mount deck to root
		$root = root;
		$root.appendChild($el);
	}

	function unmount() {
		// unmount deck from root
		$root.removeChild($el);
	}
}
Deck.animationFrames = animationFrames;
Deck.ease = ease;
Deck.modules = deckModules;
Deck.Card = Card;
Deck.translate = translate;
