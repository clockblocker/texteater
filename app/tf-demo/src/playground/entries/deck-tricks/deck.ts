import {
	arrange,
	fan,
	type Place,
	type Posed,
	pile,
	place,
	type Side,
	type SlotSpec,
	type Trick,
} from "tabletop/core";
import { PLAYING_DECK, type PlayingCard } from "./playing-cards";

/**
 * The entry's Deck, pure: the order of its 52 Cards, the pose its last
 * trick left it in, the side each shows, and the Cards the reader put
 * down elsewhere. Every Place and Slot is derived from it; the felt is
 * its one Region.
 */

export const FELT = "felt";

/** deck-of-cards' Card, 62 × 88 px at its 16 px root, in rem. */
const CARD = { w: 62 / 16, h: 88 / 16 } as const;

/** The z-index the first Card the reader puts down rises to (`card.ts`'s maxZ). */
const FIRST_TOP_Z = 52;

export type DeckPose = "stack" | "fan" | "bysuit" | "poker";

type Logical = { readonly u: number; readonly v: number };

/** A Card the reader put down: its centre, rem from the felt's, its rotation (logical degrees) and its stacking order. */
type Loose = {
	readonly centre: Logical;
	readonly rotate: number;
	readonly z: number;
};

export type TrickDeck = {
	/** Bottom first. */
	readonly order: readonly string[];
	readonly pose: DeckPose;
	readonly sides: Readonly<Record<string, Side>>;
	/** Cards resting where the hand let them go, until a trick moves them. */
	readonly loose: Readonly<Record<string, Loose>>;
	/** The stacking order the next Card put down rises to. */
	readonly topZ: number;
};

export const CARD_IDS = PLAYING_DECK.map((card) => card.id);
const BY_ID = new Map(PLAYING_DECK.map((card) => [card.id, card]));

export function cardOf(id: string): PlayingCard {
	const card = BY_ID.get(id);
	if (!card) throw new Error(`no playing card ${id}`);
	return card;
}

/** A fresh Deck: the library's order, stacked, face down. */
export function freshDeck(): TrickDeck {
	return {
		order: CARD_IDS,
		pose: "stack",
		sides: Object.fromEntries(CARD_IDS.map((id) => [id, "back"])),
		loose: {},
		topZ: FIRST_TOP_Z,
	};
}

/** The library's px, as rem at its 16 px root. */
const px = (value: number) => value / 16;

/** The stack: Card i a quarter px up and to the left of the one below. */
export function stackPose(order: readonly string[]): Posed[] {
	return pile(order, FELT, { card: CARD });
}

/** The fan: 260° on a 55 px radius (`fan.js`). */
export function fanPose(order: readonly string[]): Posed[] {
	return fan(order, FELT, { card: CARD });
}

/** A row per suit, ace to king, 8 px apart, the rows 92 px apart (`bysuit.js`). */
export function bysuitPose(order: readonly string[]): Posed[] {
	return arrange(order, FELT, {
		card: CARD,
		centre: (id) => {
			const { rank, suit } = cardOf(id);
			return {
				u: px(-Math.round((6.75 - rank) * 8)),
				v: px(-Math.round((1.5 - suit) * 92)),
			};
		},
	});
}

/** The top five dealt 110 px above the stack, 70 px apart, the top Card first (`poker.js`). */
export function pokerPose(order: readonly string[]): Posed[] {
	const dealt = order.slice(-5).reverse();
	return [
		...stackPose(order.slice(0, -5)),
		...arrange(dealt, FELT, {
			card: CARD,
			centre: (_, i) => ({
				u: px(Math.round((i - 2.05) * 70)),
				v: px(Math.round(-110)),
			}),
		}),
	];
}

const POSES = {
	stack: stackPose,
	fan: fanPose,
	bysuit: bysuitPose,
	poker: pokerPose,
} as const satisfies Record<DeckPose, (order: readonly string[]) => Posed[]>;

export function poseOf(pose: DeckPose) {
	return POSES[pose];
}

/** Where each Card rests: its pose, or where the hand put it down. */
function posesOf(deck: TrickDeck): Posed[] {
	return POSES[deck.pose](deck.order).map((posed) => {
		const loose = deck.loose[posed.id];
		if (!loose) return posed;
		const [down] = arrange([posed.id], FELT, {
			card: CARD,
			centre: () => loose.centre,
			rotate: () => loose.rotate,
		});
		return down ?? posed;
	});
}

/** Every Card's Slot on the felt. */
export function slotsOf(deck: TrickDeck): SlotSpec[] {
	return posesOf(deck).map((posed) => posed.slot);
}

/**
 * The z-index of the Card at `index`: its place in the order, as each
 * trick sets it, with poker's five above the Deck at len − 1 + k.
 */
function zOf(pose: DeckPose, index: number, length: number): number {
	if (pose === "poker" && index >= length - 5)
		return 2 * (length - 1) - index;
	return index;
}

export function placesOf(deck: TrickDeck): Map<string, Place> {
	const index = new Map(deck.order.map((id, i) => [id, i]));
	return new Map(
		posesOf(deck).map((posed) => {
			const loose = deck.loose[posed.id];
			const z =
				loose?.z ??
				zOf(deck.pose, index.get(posed.id) ?? 0, deck.order.length);
			return [
				posed.id,
				place(posed.slot.id, {
					rotate: posed.rotate,
					z,
					side: deck.sides[posed.id] ?? "back",
				}),
			];
		}),
	);
}

export function sideOf(deck: TrickDeck): (id: string) => Side {
	return (id) => deck.sides[id] ?? "back";
}

/**
 * The Deck after `trick`: its order, `pose` and the sides it turned. A
 * Card it moves leaves where the hand put it; one it only turns stays.
 */
export function withTrick(
	deck: TrickDeck,
	trick: Trick,
	pose: DeckPose,
): TrickDeck {
	const loose = Object.fromEntries(
		Object.entries(deck.loose).filter(
			([id]) => !trick.moves.get(id)?.legs.length,
		),
	);
	return {
		...deck,
		order: trick.order,
		pose,
		sides: { ...deck.sides, ...Object.fromEntries(trick.sides ?? []) },
		loose,
	};
}

/**
 * `id` rests where the hand let it go, `centre` rem from the felt's and
 * turned `rotate` logical degrees, over every other Card.
 */
export function putDown(
	deck: TrickDeck,
	id: string,
	centre: Logical,
	rotate: number,
): TrickDeck {
	return {
		...deck,
		loose: { ...deck.loose, [id]: { centre, rotate, z: deck.topZ } },
		topZ: deck.topZ + 1,
	};
}

/** `id` turned over. */
export function turnOver(deck: TrickDeck, id: string): TrickDeck {
	const side = deck.sides[id] === "front" ? "back" : "front";
	return { ...deck, sides: { ...deck.sides, [id]: side } };
}
