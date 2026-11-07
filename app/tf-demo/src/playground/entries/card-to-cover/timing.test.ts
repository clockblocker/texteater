import { describe, expect, test } from "bun:test";
import { DECK_OF_CARDS } from "../deck-interactions/motion-kit";
import { DEFAULT_SETTINGS, feelOf } from "./settings";
import {
	landingMs,
	type MorphFeel,
	moveSpec,
	openTimeline,
	settledMs,
} from "./timing";

const gentle = { kind: "spring", stiffness: 120, damping: 14 } as const;

describe("landingMs", () => {
	test("lands the gentle spring about when StaggeredList starts its extras", () => {
		/* the demo fades its extra content in 400 ms after the box starts */
		const landing = landingMs(gentle);
		expect(landing).toBeGreaterThan(400);
		expect(landing).toBeLessThan(500);
	});

	test("waits out a spring's overshoot: past 5% counts as not landed", () => {
		/* gentle overshoots by about 7%, so it lands after its first peak (~373 ms) */
		expect(landingMs(gentle)).toBeGreaterThan(373);
		expect(landingMs(gentle, 0.1)).toBeLessThan(373);
	});

	test("lands a stiffer spring sooner, and an overdamped one later", () => {
		const stiff = landingMs({
			kind: "spring",
			stiffness: 260,
			damping: 26,
		});
		const sluggish = landingMs({
			kind: "spring",
			stiffness: 120,
			damping: 38,
		});
		expect(stiff).toBeLessThan(landingMs(gentle));
		expect(sluggish).toBeGreaterThan(landingMs(gentle));
	});

	test("lands a tween where its cubicInOut passes 95%, in proportion to its length", () => {
		/* 1 - (2 - 2t)³ / 2 = 0.95 at t ≈ 0.768 */
		expect(landingMs({ kind: "tween", ms: 400 })).toBeCloseTo(307, -1);
		expect(landingMs({ kind: "tween", ms: 600 })).toBeCloseTo(
			1.5 * landingMs({ kind: "tween", ms: 400 }),
			-1,
		);
	});
});

describe("settledMs", () => {
	test("waits past landing for a spring's slow tail, and a tween's last stretch", () => {
		expect(settledMs(gentle)).toBeGreaterThan(landingMs(gentle) + 200);
		const tween = { kind: "tween", ms: 400 } as const;
		expect(settledMs(tween)).toBeGreaterThan(landingMs(tween));
		expect(settledMs(tween)).toBeLessThanOrEqual(400);
	});
});

describe("moveSpec", () => {
	test("hands motion-kit a spring as it is, and a tween on deck-of-cards' curve", () => {
		expect(moveSpec(gentle)).toEqual({ stiffness: 120, damping: 14 });
		expect(moveSpec({ kind: "tween", ms: 400 })).toEqual({
			ms: 400,
			ease: DECK_OF_CARDS.ease,
		});
	});
});

describe("openTimeline", () => {
	const feel = (parts: MorphFeel["parts"]): MorphFeel => ({
		move: gentle,
		parts,
		stagger: 75,
	});

	test("starts the parts with the box, and the Cover-only parts once they land", () => {
		const landing = landingMs(gentle);
		expect(openTimeline(feel("with"), 3)).toEqual({
			partsAt: 0,
			revealAt: [landing, landing + 75, landing + 150],
		});
	});

	test("holds the parts until the box lands, and the Cover-only parts until they do", () => {
		const landing = landingMs(gentle);
		const timeline = openTimeline(feel("after"), 2);
		expect(timeline.partsAt).toBe(landing);
		expect(timeline.revealAt).toEqual([2 * landing, 2 * landing + 75]);
	});
});

describe("feelOf", () => {
	test("reads the inspector's spring or tween, part start and stagger", () => {
		expect(feelOf(DEFAULT_SETTINGS)).toEqual({
			move: gentle,
			parts: "with",
			stagger: 75,
		});
		expect(
			feelOf({
				...DEFAULT_SETTINGS,
				move: "tween",
				ms: 600,
				parts: "after",
			}).move,
		).toEqual({ kind: "tween", ms: 600 });
	});
});
