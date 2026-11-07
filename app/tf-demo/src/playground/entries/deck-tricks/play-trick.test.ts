import { describe, expect, test } from "bun:test";
import { REDUCED_TWEEN } from "../deck-interactions/motion-kit";
import { reducedClock, trickEnd } from "./play-trick";
import { PLAYING_DECK } from "./playing-cards";
import { fan, intro, poker, sort, turnDown } from "./tricks";

describe("trickEnd", () => {
	test("is when the last move lands, as the library's next() is", () => {
		expect(trickEnd(sort(PLAYING_DECK))).toBe(510 + 500 + 400);
		expect(trickEnd(fan(PLAYING_DECK, 16))).toBe(510 + 600);
		expect(trickEnd(intro(PLAYING_DECK))).toBe(500 + 510 + 1000);
		expect(trickEnd(poker(PLAYING_DECK, 16))).toBe(1250);
	});

	test("is 0 for poker's turn-down, which never holds up the queue", () => {
		expect(trickEnd(turnDown(PLAYING_DECK))).toBe(0);
	});
});

describe("reducedClock", () => {
	const plan = sort(PLAYING_DECK).plans[3];
	if (!plan) throw new Error("no plan");
	const clock = reducedClock(plan);
	const short = REDUCED_TWEEN.ms;

	test("keeps the stagger before a Card's moves", () => {
		expect(clock(30)).toBe(30);
	});

	test("squeezes the moves into the short tween, cues with them", () => {
		/* sort's restack, at 400 of its 900 ms */
		expect(clock(430)).toBeCloseTo(30 + (400 / 900) * short, 10);
		expect(clock(930)).toBe(30 + short);
	});

	test("keeps what follows the moves the same distance after them", () => {
		expect(clock(1180)).toBe(30 + short + 250);
	});
});
