import { describe, expect, test } from "bun:test";
import { decideTable } from "./decide";
import { detentOffset, flickOf } from "./geometry";

const still = { u: 0, v: 0 };

describe("B's release", () => {
	const base = {
		footprint: null,
		flickSpeed: 0.5,
		velocity: still,
		offset: { u: 0, v: 0 },
		centre: { u: 300, v: 600 },
		exit: { u: -1, v: 0 },
	};

	test("the lit target is what the release does", () => {
		expect(decideTable({ ...base, active: "tray" })).toMatchObject({
			outcome: "dismiss",
			reason: "tray",
			direction: { u: -1, v: 0 },
		});
		expect(decideTable({ ...base, active: "pad" }).outcome).toBe("expand");
		expect(decideTable({ ...base, active: "slot" }).outcome).toBe("back");
		expect(decideTable({ ...base, active: null })).toMatchObject({
			outcome: "back",
			reason: "nothing",
		});
	});

	test("a hand still moving over the pad opens the Card instead of sweeping the Deck", () => {
		expect(
			decideTable({
				...base,
				active: "pad",
				offset: { u: 300, v: -300 },
				velocity: { u: 1.2, v: -1.2 },
			}).outcome,
		).toBe("expand");
	});

	test("with nothing lit, a throw sweeps the way it went", () => {
		expect(
			decideTable({
				...base,
				active: null,
				offset: { u: -60, v: 0 },
				velocity: { u: -0.9, v: 0 },
			}),
		).toMatchObject({ outcome: "dismiss", direction: { u: -1, v: 0 } });
	});

	test("over the Deck's footprint is back", () => {
		expect(
			decideTable({
				...base,
				active: null,
				footprint: { u: 0, v: 0, w: 1200, h: 1000 },
			}).reason,
		).toBe("footprint");
	});
});

describe("geometry", () => {
	test("a flick needs speed, travel and one leading axis", () => {
		const travel = { u: 40, v: 0 };
		expect(
			flickOf({ travel, velocity: { u: 0.6, v: 0 }, minSpeed: 0.5 }),
		).not.toBeNull();
		expect(
			flickOf({
				travel: { u: 10, v: 0 },
				velocity: { u: 0.6, v: 0 },
				minSpeed: 0.5,
			}),
		).toBeNull();
		expect(
			flickOf({ travel, velocity: { u: 0.5, v: 0.45 }, minSpeed: 0.5 }),
		).toBeNull();
	});

	test("the detent gives way only around itself", () => {
		expect(detentOffset(50, 96, 0.15)).toBe(50);
		expect(detentOffset(96, 96, 0.15)).toBeCloseTo(80 + 16 * 0.85);
		expect(detentOffset(200, 96, 0.15)).toBeCloseTo(200 - 32 * 0.15);
	});
});
