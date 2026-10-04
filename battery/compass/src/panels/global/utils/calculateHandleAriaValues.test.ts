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
				regionIndex: 0,
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
				regionIndex: 1,
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
				regionIndex: 1,
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
				regionIndex: 0,
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
