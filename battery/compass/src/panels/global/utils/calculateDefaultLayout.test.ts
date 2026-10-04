import { describe, expect, test } from "bun:test";
import type { RegionConstraints } from "../../components/region/types";
import { calculateDefaultLayout } from "./calculateDefaultLayout";

const c = (
	partial: Partial<RegionConstraints> & { regionId: string },
): RegionConstraints => ({
	collapsedSize: 0,
	collapsible: false,
	defaultSize: undefined,
	disabled: undefined,
	maxSize: 100,
	minSize: 0,
	...partial,
});

describe("calculateDefaultLayout", () => {
	test("inferred", () => {
		expect(
			calculateDefaultLayout([
				c({ regionId: "a" }),
				c({ regionId: "b" }),
				c({ regionId: "c" }),
			]),
		).toMatchInlineSnapshot(`
      {
        "a": 33.333,
        "b": 33.333,
        "c": 33.333,
      }
    `);
	});

	test("explicit", () => {
		expect(
			calculateDefaultLayout([
				c({ regionId: "a", defaultSize: 25 }),
				c({ regionId: "b", defaultSize: 50 }),
				c({ regionId: "c", defaultSize: 25 }),
			]),
		).toMatchInlineSnapshot(`
      {
        "a": 25,
        "b": 50,
        "c": 25,
      }
    `);
	});

	test("mix of explicit and inferred", () => {
		expect(
			calculateDefaultLayout([
				c({ regionId: "a", defaultSize: 25 }),
				c({ regionId: "b" }),
				c({ regionId: "c" }),
			]),
		).toMatchInlineSnapshot(`
      {
        "a": 25,
        "b": 37.5,
        "c": 37.5,
      }
    `);

		expect(
			calculateDefaultLayout([
				c({ regionId: "a", defaultSize: 20 }),
				c({ regionId: "b", defaultSize: 50 }),
				c({ regionId: "c" }),
			]),
		).toMatchInlineSnapshot(`
      {
        "a": 20,
        "b": 50,
        "c": 30,
      }
    `);
	});
});
