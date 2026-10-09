import { describe, expect, test } from "bun:test";
import type { HitArea } from "../dom/calculateHitAreas";
import {
	across,
	type Box,
	fakeSplit,
	region,
	useDomStandIns,
} from "../test/fakeSplit";
import { findClosestHitArea } from "./findClosestHitArea";

useDomStandIns();

const split = fakeSplit({
	children: [region("a", across(0, 100)), region("b", across(100, 100))],
});

function hitArea({ x, y, width, height }: Box): HitArea {
	const [first, second] = split.regions;
	if (!first || !second) {
		throw new Error("The fixture Split has two Regions");
	}
	return {
		split,
		splitSize: 200,
		regions: [first, second],
		rect: new DOMRect(x, y, width, height),
		rightToLeft: false,
	};
}

/** Built per test: `DOMRect` exists only once the stand-ins are installed. */
function leftAndRight() {
	return {
		left: hitArea({ x: 100, y: 0, width: 20, height: 100 }),
		right: hitArea({ x: 220, y: 200, width: 20, height: 100 }),
	};
}

describe("findClosestHitArea", () => {
	test("finds nothing among no areas", () => {
		expect(findClosestHitArea("horizontal", [], { x: 0, y: 0 })).toBe(
			undefined,
		);
	});

	test("reports a point inside an area at distance zero", () => {
		const { left, right } = leftAndRight();
		expect(
			findClosestHitArea("horizontal", [left, right], { x: 110, y: 50 }),
		).toEqual({ hitArea: left, distance: { x: 0, y: 0 } });
	});

	test("ranks a horizontal Split's areas by x distance alone", () => {
		const { left, right } = leftAndRight();
		const match = findClosestHitArea("horizontal", [left, right], {
			x: 200,
			y: 50,
		});
		expect(match?.hitArea).toBe(right);
		expect(match?.distance).toEqual({ x: 20, y: 150 });
	});

	test("ranks a vertical Split's areas by y distance alone", () => {
		const { left, right } = leftAndRight();
		const match = findClosestHitArea("vertical", [left, right], {
			x: 230,
			y: 120,
		});
		expect(match?.hitArea).toBe(left);
		expect(match?.distance).toEqual({ x: 110, y: 20 });
	});

	test("takes the later of two equally close areas", () => {
		const { left, right } = leftAndRight();
		const match = findClosestHitArea("horizontal", [left, right], {
			x: 170,
			y: 50,
		});
		expect(match?.hitArea).toBe(right);
		expect(match?.distance).toEqual({ x: 50, y: 150 });
	});

	test("matches a far-away point to the closest area", () => {
		const { left, right } = leftAndRight();
		const match = findClosestHitArea("horizontal", [left, right], {
			x: -500,
			y: -500,
		});
		expect(match?.hitArea).toBe(left);
		expect(match?.distance).toEqual({ x: 600, y: 500 });
	});
});
