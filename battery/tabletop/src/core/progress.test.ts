import { describe, expect, test } from "bun:test";
import { DECK_OF_CARDS_EASE } from "./ease";
import type { Move, Pose } from "./move";
import { landing, type RetargetInput, retarget } from "./retarget";
import { SPRINGS, TURN_TWEEN } from "./springs";
import {
	BOX_CHANNELS,
	done,
	shareAfter,
	sumAt,
	type Term,
	valueAt,
	velocityAt,
} from "./term";

/**
 * #1311's rules for a Body and its Parts: one progress per move, no
 * overshoot, and a retarget that keeps position and speed.
 */

function input(
	from: Pose,
	to: Pose,
	move: Move,
	live: readonly Term[] = [],
	now = 0,
): RetargetInput {
	return { live, from, to, move, now, turn: TURN_TWEEN };
}

const all = (result: ReturnType<typeof retarget>) => [
	...result.kept,
	...result.added,
];

/* a Card's box into its Cover's: every channel a different distance */
const CARD: Pose = { x: 234, y: 568, width: 256, height: 144 };
const COVER: Pose = { x: 97, y: 49, width: 530.5, height: 902 };

const MOVES: Record<string, Move> = {
	"an app spring": { source: "app", spring: SPRINGS.morph },
	"an app tween": {
		source: "app",
		tween: { ms: 300, ease: DECK_OF_CARDS_EASE.cubicInOut },
	},
	"a release": {
		source: "hand",
		velocity: { x: -900, y: -2600 },
		spring: SPRINGS.settle,
	},
};

const boxTerms = (terms: readonly Term[]) =>
	terms.filter((term) =>
		(BOX_CHANNELS as readonly string[]).includes(term.channel),
	);

describe("one progress per move (rule 1)", () => {
	for (const [name, move] of Object.entries(MOVES))
		test(`${name}: the box's place and size ride one curve, and end on the same frame`, () => {
			const terms = boxTerms(all(retarget(input(CARD, COVER, move))));
			expect(terms).toHaveLength(4);
			const [first] = terms;
			if (!first) throw new Error("no Term");
			for (const term of terms) expect(term.curve).toBe(first.curve);
			for (let now = 0; now <= 1200; now += 4) {
				const share = valueAt(first, now) / first.delta;
				for (const term of terms)
					expect(valueAt(term, now) / term.delta).toBeCloseTo(
						share,
						12,
					);
				const ended = terms.map((term) => done(term, now));
				expect(new Set(ended).size).toBe(1);
			}
		});

	test("a Term on a move's curve, as a Part's is, rides the same progress", () => {
		const [leader] = boxTerms(
			all(retarget(input(CARD, COVER, MOVES["an app spring"] as Move))),
		);
		if (!leader) throw new Error("no Term");
		const part: Term = { ...leader, channel: "y", delta: 17.6 };
		for (let now = 0; now <= 1200; now += 4)
			expect(valueAt(part, now) / part.delta).toBeCloseTo(
				valueAt(leader, now) / leader.delta,
				12,
			);
	});

	test("a progress ends within a ten-thousandth of its way, so no channel snaps at its end (rule 9)", () => {
		const curve = { kind: "spring" as const, ...SPRINGS.morph, rate: 0 };
		let last = 1;
		for (let t = 0; t < 3000; t += 1) {
			const share = shareAfter(curve, t);
			if (share === 0) break;
			last = share;
		}
		expect(Math.abs(last)).toBeLessThan(1e-4);
	});
});

describe("no overshoot on size or place (rule 5)", () => {
	const BOX_SPRINGS = {
		settle: SPRINGS.settle,
		reflow: SPRINGS.reflow,
		fly: SPRINGS.fly,
		morph: SPRINGS.morph,
	};

	for (const [name, spring] of Object.entries(BOX_SPRINGS))
		test(`${name} is damped at ζ ≥ 0.97 and never passes its rest from rest`, () => {
			expect(
				spring.damping / (2 * Math.sqrt(spring.stiffness)),
			).toBeGreaterThanOrEqual(0.97);
			const curve = { kind: "spring" as const, ...spring, rate: 0 };
			for (let t = 0; t <= 3000; t += 1)
				expect(shareAfter(curve, t)).toBeGreaterThanOrEqual(-1e-6);
		});

	test("a release never passes its rest, however fast the hand comes in, and keeps the hand's speed", () => {
		const shown: Pose = { x: 60, y: 140, width: 256, height: 144 };
		const rest: Pose = { x: 0, y: 0, width: 256, height: 144 };
		for (const speed of [0, 400, 1500, 3700, 9000, 40_000]) {
			/* straight at the rest */
			const way = Math.hypot(60, 140);
			const velocity = {
				x: (-60 / way) * speed,
				y: (-140 / way) * speed,
			};
			const terms = all(
				retarget(
					input(shown, rest, {
						source: "hand",
						velocity,
						spring: SPRINGS.settle,
					}),
				),
			);
			const x = terms.find((term) => term.channel === "x");
			const y = terms.find((term) => term.channel === "y");
			if (!x || !y) throw new Error("no Term");
			expect(velocityAt(x, 0)).toBeCloseTo(velocity.x, 6);
			expect(velocityAt(y, 0)).toBeCloseTo(velocity.y, 6);
			for (let now = 0; now <= 2000; now += 1) {
				expect(sumAt(terms, "x", now)).toBeGreaterThanOrEqual(-1e-6);
				expect(sumAt(terms, "y", now)).toBeGreaterThanOrEqual(-1e-6);
			}
		}
	});

	test("a hand faster than its spring lands on a critically damped spring of its own rate", () => {
		expect(landing(SPRINGS.settle, 10)).toBe(SPRINGS.settle);
		const fast = landing(SPRINGS.settle, 60);
		expect(fast.stiffness).toBeCloseTo(3600, 6);
		expect(fast.damping / (2 * Math.sqrt(fast.stiffness))).toBe(1);
	});
});

describe("a retarget that adds Terms (design B)", () => {
	const reflow: Move = { source: "app", spring: SPRINGS.morph };
	const shown = (rest: Pose, terms: readonly Term[], now: number) =>
		Object.fromEntries(
			BOX_CHANNELS.map((channel) => [
				channel,
				(rest[channel] ?? 0) + sumAt(terms, channel, now),
			]),
		);
	const speed = (terms: readonly Term[], now: number) =>
		Object.fromEntries(
			BOX_CHANNELS.map((channel) => [
				channel,
				terms
					.filter((term) => term.channel === channel)
					.reduce((sum, term) => sum + velocityAt(term, now), 0),
			]),
		);

	for (const at of [16, 90, 240])
		test(`turned back ${at} ms into an open, every channel keeps its place and its speed`, () => {
			const open = all(retarget(input(CARD, COVER, reflow)));
			const close = retarget(input(COVER, CARD, reflow, open, at));
			const after = all(close);
			expect(close.kept.length).toBeGreaterThan(0);
			const [before, now] = [
				shown(COVER, open, at),
				shown(CARD, after, at),
			];
			const [was, is] = [speed(open, at), speed(after, at)];
			for (const channel of BOX_CHANNELS) {
				expect(now[channel]).toBeCloseTo(before[channel] ?? 0, 9);
				expect(is[channel]).toBeCloseTo(was[channel] ?? 0, 6);
			}
			/* and lands on the new rest */
			const end = shown(CARD, after, at + 3000);
			for (const channel of BOX_CHANNELS)
				expect(end[channel]).toBe(CARD[channel] ?? 0);
		});

	test("a second retarget onto a third rest is as continuous", () => {
		const elsewhere: Pose = { x: 700, y: 300, width: 256, height: 144 };
		const first = all(retarget(input(CARD, COVER, reflow)));
		const second = all(
			retarget(input(COVER, elsewhere, reflow, first, 60)),
		);
		const third = all(
			retarget(input(elsewhere, CARD, reflow, second, 140)),
		);
		const before = shown(elsewhere, second, 140);
		const now = shown(CARD, third, 140);
		for (const channel of BOX_CHANNELS)
			expect(now[channel]).toBeCloseTo(before[channel] ?? 0, 9);
	});
});
