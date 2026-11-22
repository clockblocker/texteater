import { describe, expect, test } from "bun:test";
import type { RegionConstraints } from "../../components/region/types";
import { calculateHandleAriaValues } from "./calculateHandleAriaValues";

const DEFAULT_REGION_CONSTRAINTS = {
	collapsedSize: 0,
	collapsible: false,
	defaultSize: undefined,
	disabled: undefined,
	minSize: 0,
	maxSize: 100,
};

describe("calculateHandleAriaValues", () => {
	test("should calculate the correct min/max/now values for collapsible regions", () => {
		const regionConstraints: RegionConstraints[] = [
			{
				...DEFAULT_REGION_CONSTRAINTS,
				collapsedSize: 5,
				collapsible: true,
				disabled: undefined,
				maxSize: 70,
				minSize: 20,
				regionId: "left",
			},
			{
				...DEFAULT_REGION_CONSTRAINTS,
				minSize: 20,
				regionId: "right",
			},
		];

		expect(
			calculateHandleAriaValues({
				layout: { left: 35, right: 65 },
				regionId: "left",
				regionConstraints,
			}),
		).toMatchInlineSnapshot(`
      {
        "valueControls": "left",
        "valueMax": 70,
        "valueMin": 5,
        "valueNow": 35,
      }
    `);
	});

	test("should consider other region constraints when computing min/max values", () => {
		const regionConstraints: RegionConstraints[] = [
			{
				...DEFAULT_REGION_CONSTRAINTS,
				minSize: 10,
				regionId: "left",
			},
			{
				...DEFAULT_REGION_CONSTRAINTS,
				minSize: 20,
				regionId: "center",
			},
			{
				...DEFAULT_REGION_CONSTRAINTS,
				minSize: 30,
				regionId: "right",
			},
		];

		expect(
			calculateHandleAriaValues({
				layout: { left: 35, center: 25, right: 40 },
				regionConstraints,
				regionId: "center",
			}),
		).toMatchInlineSnapshot(`
      {
        "valueControls": "center",
        "valueMax": 35,
        "valueMin": 20,
        "valueNow": 25,
      }
    `);

		expect(
			calculateHandleAriaValues({
				layout: { left: 10, center: 35, right: 55 },
				regionConstraints,
				regionId: "center",
			}),
		).toMatchInlineSnapshot(`
      {
        "valueControls": "center",
        "valueMax": 60,
        "valueMin": 20,
        "valueNow": 35,
      }
    `);
	});

	test("derives the second handle's region index on a 3-region Split so its min/max use [1, 2]", () => {
		const regionConstraints: RegionConstraints[] = [
			{
				...DEFAULT_REGION_CONSTRAINTS,
				minSize: 20,
				maxSize: 50,
				regionId: "left",
			},
			{
				...DEFAULT_REGION_CONSTRAINTS,
				minSize: 15,
				maxSize: 60,
				regionId: "center",
			},
			{
				...DEFAULT_REGION_CONSTRAINTS,
				minSize: 25,
				maxSize: 70,
				regionId: "right",
			},
		];

		// Second handle controls "center" between "center" (index 1) and "right" (index 2).
		// With layout { left: 30, center: 35, right: 35 }:
		// - Shrinking center to min (15) shifts 20 to right (55 <= max 70) -> valueMin = 15.
		// - Growing center can only take 10 from right (35 - 25 = 10) -> valueMax = 45.
		// Previously, passing regionIndex=0 used pivots [0, 1] and yielded wrong bounds.
		expect(
			calculateHandleAriaValues({
				layout: { left: 30, center: 35, right: 35 },
				regionConstraints,
				regionId: "center",
			}),
		).toEqual({
			valueControls: "center",
			valueMin: 15,
			valueMax: 45,
			valueNow: 35,
		});
	});

	test("should assign aria-controls if an explicit id was passed as a prop", () => {
		const regionConstraints: RegionConstraints[] = [
			{
				...DEFAULT_REGION_CONSTRAINTS,
				collapsedSize: 5,
				collapsible: true,
				maxSize: 70,
				minSize: 20,
				regionId: "left",
			},
			{
				...DEFAULT_REGION_CONSTRAINTS,
				minSize: 20,
				regionId: "right",
			},
		];

		expect(
			calculateHandleAriaValues({
				layout: { left: 35, right: 65 },
				regionId: "left",
				regionConstraints,
			}),
		).toMatchInlineSnapshot(`
      {
        "valueControls": "left",
        "valueMax": 70,
        "valueMin": 5,
        "valueNow": 35,
      }
    `);
	});
});
