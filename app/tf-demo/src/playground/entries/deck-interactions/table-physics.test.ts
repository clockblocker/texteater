import { describe, expect, test } from "bun:test";
import {
	boxUnderHand,
	handOverBox,
	hopVelocity,
	liveTarget,
	pulled,
	stripExit,
} from "./table-physics";

const side = { u: 16, v: 400, w: 64, h: 440 };
const foot = { u: 16, v: 920, w: 540, h: 64 };
const pad = { u: 1000, v: 16, w: 192, h: 128 };
const home = { u: 600, v: 300 };
const base = {
	home,
	tray: [side, foot],
	pad,
	radius: 48,
	slotReach: 96,
	previous: null,
	slotArmed: true,
};

describe("the lit target", () => {
	test("a Card just lifted does not light its own slot", () => {
		expect(
			liveTarget({ ...base, point: home, slotArmed: false }).target,
		).toBeNull();
		expect(liveTarget({ ...base, point: home }).target).toBe("slot");
	});

	test("the tray and the pad light within their reach, and only one at a time", () => {
		expect(liveTarget({ ...base, point: { u: 300, v: 900 } }).target).toBe(
			"tray",
		);
		expect(liveTarget({ ...base, point: { u: 980, v: 60 } }).target).toBe(
			"pad",
		);
		expect(
			liveTarget({ ...base, point: { u: 900, v: 600 } }).target,
		).toBeNull();
	});

	test("a lit target keeps 12 px more reach", () => {
		const point = { u: 1000 - 55, v: 60 };
		expect(liveTarget({ ...base, point }).target).toBeNull();
		expect(liveTarget({ ...base, point, previous: "pad" }).target).toBe(
			"pad",
		);
	});

	test("the pull fades to nothing at the edge of the reach, so the Card never lurches", () => {
		const atEdge = { u: 1000 - 47.9, v: 60 };
		const lit = liveTarget({ ...base, point: atEdge });
		const moved = pulled(atEdge, lit, 0.35);
		expect(Math.hypot(moved.u - atEdge.u, moved.v - atEdge.v)).toBeLessThan(
			0.1,
		);
		const over = { u: 1010, v: 60 };
		const inside = pulled(over, liveTarget({ ...base, point: over }), 0.35);
		expect(inside.u).toBeCloseTo(1010 + (1096 - 1010) * 0.35);
	});

	test("a strip pulls across itself, never along it", () => {
		const point = { u: 200, v: 930 };
		const moved = pulled(point, liveTarget({ ...base, point }), 1);
		expect(moved).toEqual({ u: 200, v: 952 });
	});

	test("a strip at inline-start leaves that way; one along the foot leaves down", () => {
		expect(stripExit(side)).toEqual({ u: -1, v: 0 });
		expect(stripExit(foot)).toEqual({ u: 0, v: 1 });
	});
});

describe("the Card under the hand", () => {
	const size = { w: 320, h: 352 };
	const grab = { u: 160, v: 24 };

	test("the grabbed spot stays under the hand as the Card scales", () => {
		const box = boxUnderHand({
			point: { u: 500, v: 300 },
			grab,
			size,
			pressScale: 1,
			scale: 1.1,
		});
		expect(box.u).toBeCloseTo(500 - 160);
		expect(box.v).toBeCloseTo(300 - 176 - (24 - 176) * 1.1);
		expect(
			handOverBox({ box, grab, size, pressScale: 1, scale: 1.1 }),
		).toEqual({ u: expect.closeTo(500), v: expect.closeTo(300) });
	});
});

describe("the return hop", () => {
	const stiffness = 632;

	test("kicks the Card up, more for a higher hop", () => {
		const low = hopVelocity({
			from: 600,
			to: 300,
			height: 10,
			stiffness,
			hand: 0,
		});
		const high = hopVelocity({
			from: 600,
			to: 300,
			height: 40,
			stiffness,
			hand: 0,
		});
		expect(low).toBeLessThan(0);
		expect(high).toBeLessThan(low);
	});

	test("keeps a hand that already throws it high enough, and does nothing for no hop", () => {
		expect(
			hopVelocity({
				from: 600,
				to: 300,
				height: 10,
				stiffness,
				hand: -99_000,
			}),
		).toBe(-99_000);
		expect(
			hopVelocity({
				from: 600,
				to: 300,
				height: 0,
				stiffness,
				hand: 120,
			}),
		).toBe(120);
	});
});
