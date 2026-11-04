import { describe, expect, test } from "bun:test";
import { decideTable } from "./decide";
import { detentOffset, flickOf } from "./geometry";
import { pileSlots } from "./layout";

const frame = { w: 1200, h: 1000 };
const slots = pileSlots(frame, 4);
const front = slots[3];
if (!front) throw new Error("no front slot");
const still = { u: 0, v: 0 };

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

	test("the detent gives way only around itself", () => {
		expect(detentOffset(50, 96, 0.15)).toBe(50);
		expect(detentOffset(96, 96, 0.15)).toBeCloseTo(80 + 16 * 0.85);
		expect(detentOffset(200, 96, 0.15)).toBeCloseTo(200 - 32 * 0.15);
	});
});
