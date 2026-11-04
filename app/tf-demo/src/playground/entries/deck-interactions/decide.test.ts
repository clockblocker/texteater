import { describe, expect, test } from "bun:test";
import { decideDirectional, decideTable, liveDirectional } from "./decide";
import { detentOffset, flickOf, rubberBand, tiltOf } from "./geometry";
import { footprintOf, pileSlots } from "./layout";

const frame = { w: 1200, h: 1000 };
const slots = pileSlots(frame, 4);
const front = slots[3];
if (!front) throw new Error("no front slot");
const frontCentre = { u: front.u + front.w / 2, v: front.v + front.h / 2 };
const still = { u: 0, v: 0 };

function at(offset: { u: number; v: number }) {
	return { u: frontCentre.u + offset.u, v: frontCentre.v + offset.v };
}

describe("A's release", () => {
	const base = {
		footprint: footprintOf(slots, 3),
		threshold: 110,
		flickSpeed: 0.5,
	};

	test("inline-start past the threshold dismisses, inline-end expands", () => {
		const left = { u: -130, v: 0 };
		const right = { u: 130, v: 0 };
		expect(
			decideDirectional({
				...base,
				centre: at(left),
				offset: left,
				velocity: still,
			}).outcome,
		).toBe("dismiss");
		expect(
			decideDirectional({
				...base,
				centre: at(right),
				offset: right,
				velocity: still,
			}).outcome,
		).toBe("expand");
	});

	test("short of the threshold is back", () => {
		const offset = { u: -60, v: 0 };
		expect(
			decideDirectional({
				...base,
				centre: at(offset),
				offset,
				velocity: still,
			}),
		).toMatchObject({ outcome: "back", reason: "short 60" });
	});

	test("a Card from behind dropped onto the front Card is back, however far down", () => {
		const back = slots[0];
		if (!back) throw new Error("no back slot");
		const offset = { u: 0, v: 200 };
		const centre = {
			u: back.u + back.w / 2,
			v: back.v + back.h / 2 + offset.v,
		};
		expect(
			decideDirectional({
				...base,
				footprint: footprintOf(slots, 0),
				centre,
				offset,
				velocity: still,
			}),
		).toMatchObject({ outcome: "back", reason: "footprint" });
	});

	test("a fast short throw sweeps the way it went", () => {
		const offset = { u: -40, v: 0 };
		const decision = decideDirectional({
			...base,
			centre: at(offset),
			offset,
			velocity: { u: -0.8, v: 0 },
		});
		expect(decision.outcome).toBe("dismiss");
		expect(decision.reason).toBe("flick 0.80");
		expect(decision.direction).toEqual({ u: -1, v: 0 });
	});

	test("a zone is held 12 px short of the line that entered it", () => {
		const offset = { u: -100, v: 0 };
		const entered = liveDirectional({
			...base,
			centre: at({ u: -115, v: 0 }),
			offset: { u: -115, v: 0 },
			previous: null,
		});
		expect(entered.zone).toBe("dismiss");
		expect(
			liveDirectional({
				...base,
				centre: at(offset),
				offset,
				previous: entered,
			}).zone,
		).toBe("dismiss");
		expect(
			liveDirectional({
				...base,
				centre: at(offset),
				offset,
				previous: null,
			}).zone,
		).toBe("back");
	});
});

describe("B's release", () => {
	const targets = {
		slot: front,
		tray: [{ u: 16, v: 900, w: 500, h: 64 }],
		pad: { u: 900, v: 16, w: 192, h: 128 },
	};
	const base = {
		footprint: null,
		targets,
		radius: 48,
		flickSpeed: 0.5,
		previous: null,
		velocity: still,
		offset: { u: 0, v: 0 },
	};

	test("over the tray dismisses, over the pad expands, over nothing is back", () => {
		const centre = { u: 300, v: 600 };
		expect(
			decideTable({ ...base, centre, point: { u: 100, v: 930 } }).outcome,
		).toBe("dismiss");
		expect(
			decideTable({ ...base, centre, point: { u: 1000, v: 60 } }).outcome,
		).toBe("expand");
		expect(
			decideTable({ ...base, centre, point: { u: 1100, v: 600 } }),
		).toMatchObject({ outcome: "back", reason: "nothing" });
	});

	test("over the Deck's footprint is back, even near the tray", () => {
		expect(
			decideTable({
				...base,
				footprint: { u: 0, v: 0, w: 1200, h: 1000 },
				centre: { u: 300, v: 600 },
				point: { u: 100, v: 930 },
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

	test("the lean is clamped and turns over from a bottom-half grab", () => {
		const lean = {
			dx: 1000,
			vx: 0,
			perPx: 0.05,
			max: 12,
			velocityGain: 4,
			velocityMax: 6,
		};
		expect(tiltOf({ ...lean, hinge: false })).toBe(12);
		expect(tiltOf({ ...lean, hinge: true })).toBe(-12);
		expect(tiltOf({ ...lean, dx: 0, vx: 5, hinge: false })).toBe(6);
	});

	test("the rubber band never passes its limit", () => {
		expect(Math.abs(rubberBand(10_000, 40))).toBeLessThan(40);
		expect(rubberBand(-20, 40)).toBeLessThan(0);
	});

	test("the detent gives way only around itself", () => {
		expect(detentOffset(50, 96, 0.15)).toBe(50);
		expect(detentOffset(96, 96, 0.15)).toBeCloseTo(80 + 16 * 0.85);
		expect(detentOffset(200, 96, 0.15)).toBeCloseTo(200 - 32 * 0.15);
	});
});
