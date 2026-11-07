import type { Card } from "./card";
import type { Deck } from "./deck";
import { bysuit } from "./modules/bysuit";
import { fan } from "./modules/fan";
import { flip } from "./modules/flip";
import { intro } from "./modules/intro";
import { poker } from "./modules/poker";
import { shuffle } from "./modules/shuffle";
import { sort } from "./modules/sort";

/** A plug-in: it adds its methods to every new Deck and every new Card. */
type DeckModule = {
	readonly deck?: (deck: Deck) => void;
	readonly card?: (card: Card) => void;
};

/**
 * Upstream's `Deck.modules`, kept in its own module so `card` and `deck`
 * don't import each other; `Deck.modules` is this same object.
 */
export const deckModules: Record<string, DeckModule> = {
	bysuit,
	fan,
	intro,
	poker,
	shuffle,
	sort,
	flip,
};
