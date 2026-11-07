import { describe, expect, test } from "bun:test";
import type { Pose } from "./move";
import { fan, pile } from "./poses";
import { REDUCED, reduce } from "./reduce";
import { retarget } from "./retarget";
import { TURN_TWEEN } from "./springs";
import { landsAt, type Term } from "./term";
import { type Trick, trickMove } from "./trick";
import { deal, fanOut, flip, poker, shuffle, sort, turnDown } from "./tricks";

const CARD = { w: 62 / 16, h: 88 / 16 };
const DECK = Array.from({ length: 52 }, (_, i) => `c${i}`);
const stack = (order: readonly string[]) => pile(order, "felt", { card: CARD });
const FRAME = { remPx: 16, dir: 1 } as const;
const rank = (id: string) => Number(id.slice(1));

/** A Card resting at the origin on `turn`, `x` px from where it shows. */
const rest = (turn: number, x = 0): Pose => ({
	x,
	y: 0,
	width: 0,
	height: 0,
	rotate: 0,
	opacity: 0,
	lift: 0,
	turn,
	z: 0,
});

/** Every Term the Table gives `trick`'s Cards, each shown `off` px away. */
function played(trick: Trick, reduced = false, off = 0): Term[] {
	return [...trick.moves].flatMap(([id, move]) => {
		const to = trick.sides?.get(id) === "front" ? 0 : 180;
		const { added } = retarget({
			live: [],
			from: rest(180, off),
			to: rest(to),
			move: trickMove(move, FRAME),
			now: 0,
			turn: TURN_TWEEN,
		});
		return reduce(added, { reduced });
	});
}

describe("trickMove", () => {
	test("turns rem into px and mirrors the inline axis and rotation in RTL", () => {
		const move = trickMove(
			{
				from: { u: 1, opacity: -1, turn: -180 },
				legs: [{ at: 10, ms: 300, to: { u: 2, v: -1, rotate: 30 } }],
				zAt: 310,
			},
			{ remPx: 16, dir: -1 },
		);
		if (!("tween" in move)) throw new Error("a trick plays on a tween");
		expect(move.path?.x).toEqual([{ at: 10, ms: 300, to: -32 }]);
		expect(move.path?.y).toEqual([{ at: 10, ms: 300, to: -16 }]);
		expect(move.path?.rotate).toEqual([{ at: 10, ms: 300, to: -30 }]);
		expect(move.from).toEqual({ x: -16, opacity: -1, turn: -180 });
		expect(move.zAt).toBe(310);
	});
});

describe("when a trick lands, so the next one queued starts", () => {
	test("is when its last move lands, as the library's next() is", () => {
		expect(landsAt(played(sort(DECK, stack, { rank })))).toBe(
			510 + 500 + 400,
		);
		expect(
			landsAt(
				played(
					fanOut(DECK, (order) => fan(order, "felt", { card: CARD })),
				),
			),
		).toBe(510 + 600);
		expect(landsAt(played(deal(DECK, stack, { faceDown: true })))).toBe(
			500 + 510 + 1000,
		);
		expect(landsAt(played(shuffle(DECK, stack)))).toBe(102 + 400);
	});

	test("doesn't wait for the turns it cues after its last move", () => {
		/* the five leave the stack for the row, 100 px off */
		const dealt = played(poker(DECK, stack), false, 100);
		expect(landsAt(dealt)).toBe(1250);
		const turn = dealt.find(
			(term) => term.channel === "turn" && term.delayMs === 1250,
		);
		expect(turn?.curve).toMatchObject({ ms: TURN_TWEEN.ms });
	});

	test("is at once for a trick that only turns Cards over", () => {
		expect(landsAt(played(turnDown(DECK, stack)))).toBe(0);
		expect(
			landsAt(played(flip(DECK, stack, { sideOf: () => "back" }))),
		).toBe(0);
	});

	test("keeps each Card's stagger under reduced motion, then waits out its dissolve", () => {
		const terms = played(sort(DECK, stack, { rank }), true, 100);
		expect(landsAt(terms)).toBe(510 + 2 * REDUCED.dissolveMs);
	});
});
