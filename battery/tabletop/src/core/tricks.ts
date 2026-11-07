import type { Logical } from "./geometry";
import type { Side } from "./place";
import { STACK_STEP } from "./poses";
import { DECK_OF_CARDS } from "./springs";
import { AT_REST, allOn, type PoseOf, type Trick, trickOf } from "./trick";

/**
 * deck-of-cards' tricks as plans, with every number the library's own
 * (`lib/modules/*.js` at 54f2c4787ea5, MIT, `LICENSE-deck-of-cards`). Its
 * px are rem at its 16 px root, and `scale` sizes them to Cards bigger
 * than its 62 × 88 px ones. Every place a leg goes that the library gives
 * from the Deck's centre is measured from `gather`, rem from the Region's
 * centre; anything it leaves alone stays at the Card's final rest.
 */

/**
 * The intro: every Card drops from 250 px above its rest, fading in over
 * the 1000 ms fall, 500 ms plus 10 ms a Card after the start. With
 * `faceDown` it falls face up and turns over 250 ms after it lands, as the
 * library's does, and ends face down.
 */
export function deal(
	order: readonly string[],
	poseOf: PoseOf,
	{
		scale = 1,
		faceDown = false,
	}: { readonly scale?: number; readonly faceDown?: boolean } = {},
): Trick {
	return trickOf(
		order,
		poseOf(order),
		(_, i) => {
			const at = 500 + i * 10;
			return {
				from: {
					u: 0,
					v: (-250 / 16) * scale,
					w: 0,
					h: 0,
					rotate: 0,
					opacity: -1,
					...(faceDown ? { turn: -180 } : {}),
				},
				legs: [
					{ at, ms: 1000, to: { u: 0, v: 0 } },
					{
						at,
						ms: 1000,
						to: { opacity: 0 },
						ease: DECK_OF_CARDS.linear,
					},
				],
				zAt: at,
				...(faceDown ? { sideAt: at + 1250 } : {}),
			};
		},
		faceDown ? allOn(order, "back") : undefined,
	);
}

/**
 * Gathers the Deck onto `gather` in 300 ms, 10 ms a Card apart, then
 * spreads it into the fan in another 300.
 */
export function fanOut(
	order: readonly string[],
	poseOf: PoseOf,
	{ gather = { u: 0, v: 0 } }: { readonly gather?: Logical } = {},
): Trick {
	return trickOf(order, poseOf(order), (posed, i) => {
		const at = i * 10;
		return {
			legs: [
				{
					at,
					ms: 300,
					to: {
						u: gather.u + i * STACK_STEP.u - posed.centre.u,
						v: gather.v + i * STACK_STEP.v - posed.centre.v,
						rotate: -posed.rotate,
					},
				},
				{ at: 300 + at, ms: 300, to: AT_REST },
			],
			zAt: 300 + at,
		};
	});
}

/** Fisher–Yates over `order`, drawing as the library draws. */
function reorder(
	order: readonly string[],
	random: () => number,
): readonly string[] {
	const next = [...order];
	for (let i = next.length - 1; i; i--) {
		const j = Math.floor(random() * (i + 1));
		[next[i], next[j]] = [next[j] as string, next[i] as string];
	}
	return next;
}

/**
 * Reorders the Deck at random and slides each Card out to 20–60 px either
 * side of `gather`, level with its new place, in 200 ms, and back into it
 * in another 200, 2 ms a Card apart. `random` stands in for `Math.random`,
 * drawn in the library's order: the reorder first, then per Card the
 * distance and then the side.
 */
export function shuffle(
	order: readonly string[],
	poseOf: PoseOf,
	{
		scale = 1,
		gather = { u: 0, v: 0 },
		random = Math.random,
	}: {
		readonly scale?: number;
		readonly gather?: Logical;
		readonly random?: () => number;
	} = {},
): Trick {
	const next = reorder(order, random);
	return trickOf(next, poseOf(next), (posed, i) => {
		const at = i * 2;
		const distance = random() * 40 + 20;
		const sign = Math.round(random()) ? -1 : 1;
		return {
			legs: [
				{
					at,
					ms: 200,
					to: {
						u:
							gather.u +
							(sign * distance * scale) / 16 -
							posed.centre.u,
						v: 0,
						rotate: -posed.rotate,
					},
				},
				{ at: at + 200, ms: 200, to: AT_REST },
			],
			zAt: at + 200,
		};
	});
}

/**
 * Orders the Deck by `rank`, highest at the bottom (`reverse`: lowest),
 * each Card lifted to 150 px above `gather` in 400 ms, restacked there,
 * and put down from 500 ms; 10 ms a Card apart.
 */
export function sort(
	order: readonly string[],
	poseOf: PoseOf,
	{
		rank,
		reverse = false,
		scale = 1,
		gather = { u: 0, v: 0 },
	}: {
		readonly rank: (id: string) => number;
		readonly reverse?: boolean;
		readonly scale?: number;
		readonly gather?: Logical;
	},
): Trick {
	const next = [...order].sort((a, b) =>
		reverse ? rank(a) - rank(b) : rank(b) - rank(a),
	);
	return trickOf(next, poseOf(next), (posed, i) => {
		const at = i * 10;
		return {
			legs: [
				{
					at,
					ms: 400,
					to: {
						u: 0,
						v: gather.v - (150 * scale) / 16 - posed.centre.v,
						rotate: -posed.rotate,
					},
				},
				{ at: at + 500, ms: 400, to: AT_REST },
			],
			zAt: at + 400,
		};
	});
}

/**
 * The library's bysuit: every Card straight to its rest in 400 ms, 10 ms
 * apart by its own number (`index`, the library's `card.i`), not by its
 * place in the order. The order and the stacking stay; `poseOf` lays the
 * rows out, a suit to each.
 */
export function bysuit(
	order: readonly string[],
	poseOf: PoseOf,
	{ index }: { readonly index: (id: string) => number },
): Trick {
	return trickOf(order, poseOf(order), (posed) => ({
		legs: [{ at: index(posed.id) * 10, ms: 400, to: AT_REST }],
	}));
}

/**
 * The library's poker: deals the top five Cards (the last five of
 * `order`), the top first, 250 ms apart, each straight to its rest in
 * 250 ms. Each rises to its final stacking order as it leaves and turns
 * face up as it lands; `poseOf` lays the five out. The rest stay put.
 */
export function poker(order: readonly string[], poseOf: PoseOf): Trick {
	const dealt = order.slice(-5).reverse();
	return {
		order,
		rest: poseOf(order),
		sides: allOn(dealt, "front"),
		moves: new Map(
			dealt.map((id, i) => {
				const at = i * 250;
				return [
					id,
					{
						legs: [{ at, ms: 250, to: AT_REST }],
						zAt: at,
						sideAt: at + 250,
					},
				];
			}),
		),
	};
}

/**
 * The library's flip: every Card turns over at once, to `side`, or
 * without one face down when more than half show their front and face up
 * otherwise. Nothing moves.
 */
export function flip(
	order: readonly string[],
	poseOf: PoseOf,
	{
		sideOf,
		side,
	}: { readonly sideOf: (id: string) => Side; readonly side?: Side },
): Trick {
	const up = order.filter((id) => sideOf(id) === "front").length;
	const to: Side =
		side ?? (up / Math.max(order.length, 1) > 0.5 ? "back" : "front");
	return trickOf(
		order,
		poseOf(order),
		() => ({ legs: [], sideAt: 0 }),
		allOn(order, to),
	);
}

/**
 * Poker's first step in the library's example: every Card turns face
 * down, 7.5 ms a Card apart. Nothing moves, so the next trick queued
 * starts at once.
 */
export function turnDown(order: readonly string[], poseOf: PoseOf): Trick {
	return trickOf(
		order,
		poseOf(order),
		(_, i) => ({ legs: [], sideAt: i * 7.5 }),
		allOn(order, "back"),
	);
}
