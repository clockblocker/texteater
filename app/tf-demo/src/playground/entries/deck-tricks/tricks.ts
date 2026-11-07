import { DECK_OF_CARDS, type Phase } from "../deck-interactions/motion-kit";
import type { PlayingCard, Side } from "./playing-cards";

/**
 * deck-of-cards' tricks as plans: for each Card, where it starts, the legs
 * each of its values moves through, and the moments its z-index and side
 * change, in ms from the moment the trick runs. x and y are the library's
 * px from the felt's centre to the Card's; every number is the library's.
 */
export type Channel = "x" | "y" | "rot" | "o";

type Cue<T> = { readonly at: number; readonly to: T };

export type CardPlan = {
	readonly id: string;
	/** Jumped to before anything plays. */
	readonly from?: Partial<Record<Channel, number>>;
	readonly moves?: Partial<Record<Channel, readonly Phase[]>>;
	readonly z?: readonly Cue<number>[];
	readonly side?: readonly Cue<Side>[];
};

/** The Deck's order after the trick, bottom first, and every Card's plan. */
export type Trick = {
	readonly order: readonly PlayingCard[];
	readonly plans: readonly CardPlan[];
};

type Pose = { readonly x?: number; readonly y?: number; readonly rot?: number };
type Step = { readonly at: number; readonly ms: number; readonly to: Pose };

/** Where Card `i` of the stack rests on both axes: a quarter px per Card. */
export function stackOffset(i: number): number {
	return -i / 4;
}

/** Steps that each move x, y and rot together, split into each value's legs. */
function legs(steps: readonly Step[]): CardPlan["moves"] {
	const of = (key: keyof Pose) =>
		steps.flatMap(({ at, ms, to }) => {
			const value = to[key];
			return value === undefined ? [] : [{ at, ms, to: value }];
		});
	return { x: of("x"), y: of("y"), rot: of("rot") };
}

/** Drops every Card face up from 250 px above onto the stack, then turns it. */
export function intro(order: readonly PlayingCard[]): Trick {
	return {
		order,
		plans: order.map((card, i) => {
			const z = stackOffset(i);
			const at = 500 + i * 10;
			return {
				id: card.id,
				from: { x: z, y: -250 + z, rot: 0, o: 0 },
				moves: {
					...legs([{ at, ms: 1000, to: { x: z, y: z } }]),
					o: [{ at, ms: 1000, to: 1, ease: DECK_OF_CARDS.linear }],
				},
				z: [{ at, to: i }],
				side: [
					{ at: 0, to: "front" },
					{ at: at + 1000 + 250, to: "back" },
				],
			};
		}),
	};
}

/**
 * Orders the Deck by `i`, highest at the bottom (`reverse`: lowest), each
 * Card lifted to y −150, restacked there, and put down.
 */
export function sort(order: readonly PlayingCard[], reverse = false): Trick {
	const next = [...order].sort((a, b) => (reverse ? a.i - b.i : b.i - a.i));
	return {
		order: next,
		plans: next.map((card, i) => {
			const z = stackOffset(i);
			const at = i * 10;
			return {
				id: card.id,
				moves: legs([
					{ at, ms: 400, to: { x: z, y: -150, rot: 0 } },
					{ at: at + 500, ms: 400, to: { x: z, y: z, rot: 0 } },
				]),
				z: [{ at: at + 400, to: i }],
			};
		}),
	};
}

/**
 * Reorders the Deck at random and slides each Card 20–60 px to a random
 * side and back into its new place. `random` stands in for `Math.random`,
 * drawn in the library's order: the reorder first, then per Card the
 * distance and then the side.
 */
export function shuffle(
	order: readonly PlayingCard[],
	fontSize: number,
	random: () => number = Math.random,
): Trick {
	const next = [...order];
	for (let i = next.length - 1; i; i--) {
		const j = Math.floor(random() * (i + 1));
		[next[i], next[j]] = [next[j] as PlayingCard, next[i] as PlayingCard];
	}
	return {
		order: next,
		plans: next.map((card, i) => {
			const z = stackOffset(i);
			const at = i * 2;
			const distance = random() * 40 + 20;
			const sign = Math.round(random()) ? -1 : 1;
			return {
				id: card.id,
				moves: legs([
					{
						at,
						ms: 200,
						to: {
							x: (sign * distance * fontSize) / 16,
							y: z,
							rot: 0,
						},
					},
					{ at: at + 200, ms: 200, to: { x: z, y: z, rot: 0 } },
				]),
				z: [{ at: at + 200, to: i }],
			};
		}),
	};
}

/** Lays the Deck out in four rows, one per suit, ace to king. */
export function bysuit(order: readonly PlayingCard[], fontSize: number): Trick {
	return {
		order,
		plans: order.map((card) => ({
			id: card.id,
			moves: legs([
				{
					at: card.i * 10,
					ms: 400,
					to: {
						x: -Math.round(
							((6.75 - card.rank) * 8 * fontSize) / 16,
						),
						y: -Math.round(
							((1.5 - card.suit) * 92 * fontSize) / 16,
						),
						rot: 0,
					},
				},
			]),
		})),
	};
}

/** Gathers the Deck, then spreads it from −130° to 130° around its centre. */
export function fan(order: readonly PlayingCard[], fontSize: number): Trick {
	const len = order.length;
	return {
		order,
		plans: order.map((card, i) => {
			const z = stackOffset(i);
			const at = i * 10;
			const rot = (i / (len - 1)) * 260 - 130;
			const radians = ((rot - 90) * Math.PI) / 180;
			return {
				id: card.id,
				moves: legs([
					{ at, ms: 300, to: { x: z, y: z, rot: 0 } },
					{
						at: 300 + at,
						ms: 300,
						to: {
							x: (Math.cos(radians) * 55 * fontSize) / 16,
							y: (Math.sin(radians) * 55 * fontSize) / 16,
							rot,
						},
					},
				]),
				z: [{ at: 300 + at, to: i }],
			};
		}),
	};
}

/** Deals the top five Cards face up in a row above the Deck, 250 ms apart. */
export function poker(order: readonly PlayingCard[], fontSize: number): Trick {
	const len = order.length;
	return {
		order,
		plans: order
			.slice(-5)
			.reverse()
			.map((card, i) => {
				const at = i * 250;
				return {
					id: card.id,
					moves: legs([
						{
							at,
							ms: 250,
							to: {
								x: Math.round(
									((i - 2.05) * 70 * fontSize) / 16,
								),
								y: Math.round((-110 * fontSize) / 16),
								rot: 0,
							},
						},
					]),
					z: [{ at, to: len - 1 + i }],
					side: [{ at: at + 250, to: "front" }],
				};
			}),
	};
}

/**
 * Turns every Card to `side`, or, without one, face down when more than
 * half are face up and face up otherwise, all at once.
 */
export function flip(
	order: readonly PlayingCard[],
	sideOf: (id: string) => Side,
	side?: Side,
): Trick {
	const up = order.filter((card) => sideOf(card.id) === "front").length;
	const to = side ?? (up / order.length > 0.5 ? "back" : "front");
	return {
		order,
		plans: order.map((card) => ({ id: card.id, side: [{ at: 0, to }] })),
	};
}

/** Poker's first step: every Card face down, 7.5 ms apart, without waiting. */
export function turnDown(order: readonly PlayingCard[]): Trick {
	return {
		order,
		plans: order.map((card, i) => ({
			id: card.id,
			side: [{ at: i * 7.5, to: "back" }],
		})),
	};
}
