import { describe, expect, test } from "bun:test";
import type { RegionConstraints } from "../../components/region/types";
import { regionConstraintsEqual } from "./regionConstraintsEqual";

function createRegionConstraints(
	partial: { regionId: string } & Partial<RegionConstraints>,
): RegionConstraints {
	return {
		collapsedSize: 0,
		collapsible: false,
		defaultSize: undefined,
		disabled: undefined,
		maxSize: 100,
		minSize: 0,
		...partial,
	};
}

const cases: [RegionConstraints[], RegionConstraints[], boolean][] = [
	[[], [], true],
	[[], [createRegionConstraints({ regionId: "a" })], false],
	[[createRegionConstraints({ regionId: "a" })], [], false],
	[
		[createRegionConstraints({ regionId: "a" })],
		[createRegionConstraints({ regionId: "a" })],
		true,
	],
	[
		[
			createRegionConstraints({ regionId: "a" }),
			createRegionConstraints({ regionId: "b" }),
		],
		[
			createRegionConstraints({ regionId: "a" }),
			createRegionConstraints({ regionId: "b" }),
		],
		true,
	],
	[
		[createRegionConstraints({ regionId: "a" })],
		[
			createRegionConstraints({ regionId: "a" }),
			createRegionConstraints({ regionId: "b" }),
		],
		false,
	],
	[
		[
			createRegionConstraints({ regionId: "a" }),
			createRegionConstraints({ regionId: "b" }),
		],
		[createRegionConstraints({ regionId: "a" })],
		false,
	],
	[
		[
			createRegionConstraints({ regionId: "a" }),
			createRegionConstraints({ regionId: "b" }),
		],
		[
			createRegionConstraints({ regionId: "a" }),
			createRegionConstraints({ regionId: "b", disabled: true }),
		],
		false,
	],
	[
		[createRegionConstraints({ regionId: "a", collapsible: false })],
		[createRegionConstraints({ regionId: "a", collapsible: true })],
		false,
	],
];

describe("regionConstraintsEqual", () => {
	test.each(cases)("objectsEqual: %o, %o -> %o", (a, b, expected) => {
		expect(regionConstraintsEqual(a, b)).toBe(expected);
	});
});
