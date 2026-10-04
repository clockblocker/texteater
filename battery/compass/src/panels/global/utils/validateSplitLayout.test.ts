import { describe, expect, test } from "bun:test";
import type { RegionConstraints } from "../../components/region/types";
import type { Layout } from "../../components/split/types";
import { validateSplitLayout } from "./validateSplitLayout";

function c(partials: Partial<RegionConstraints>[]) {
	const constraints: RegionConstraints[] = [];

	partials.forEach((current, index) => {
		constraints.push({
			collapsedSize: 0,
			collapsible: false,
			defaultSize: undefined,
			disabled: undefined,
			maxSize: 100,
			minSize: 0,
			...current,
			regionId: `${index}`,
		});
	});

	return constraints;
}

function l(numbers: number[]) {
	const layout: Layout = {};

	numbers.forEach((current, index) => {
		layout[index] = current;
	});

	return layout;
}

describe("validateSplitLayout", () => {
	test("should accept requested layout if there are no constraints provided", () => {
		expect(
			validateSplitLayout({
				layout: l([10, 60, 30]),
				regionConstraints: c([{}, {}, {}]),
			}),
		).toEqual(l([10, 60, 30]));
	});

	test("should normalize layouts that do not total 100%", () => {
		expect(
			validateSplitLayout({
				layout: l([10, 20, 20]),
				regionConstraints: c([{}, {}, {}]),
			}),
		).toEqual(l([20, 40, 40]));

		expect(
			validateSplitLayout({
				layout: l([50, 100, 50]),
				regionConstraints: c([{}, {}, {}]),
			}),
		).toEqual(l([25, 50, 25]));
	});

	test("should reject layouts that do not match the number of regions", () => {
		expect(() =>
			validateSplitLayout({
				layout: l([10, 20, 30]),
				regionConstraints: c([{}, {}]),
			}),
		).toThrow("Invalid 2 region layout");

		expect(() =>
			validateSplitLayout({
				layout: l([50, 50]),
				regionConstraints: c([{}, {}, {}]),
			}),
		).toThrow("Invalid 3 region layout");
	});

	describe("minimum size constraints", () => {
		test("should adjust the layout to account for minimum percentage sizes", () => {
			expect(
				validateSplitLayout({
					layout: l([25, 75]),
					regionConstraints: c([
						{
							minSize: 35,
						},
						{},
					]),
				}),
			).toEqual(l([35, 65]));
		});

		test("should account for multiple regions with minimum size constraints", () => {
			expect(
				validateSplitLayout({
					layout: l([20, 60, 20]),
					regionConstraints: c([
						{
							minSize: 25,
						},
						{},
						{
							minSize: 25,
						},
					]),
				}),
			).toEqual(l([25, 50, 25]));
		});
	});

	describe("maximum size constraints", () => {
		test("should adjust the layout to account for maximum percentage sizes", () => {
			expect(
				validateSplitLayout({
					layout: l([25, 75]),
					regionConstraints: c([{}, { maxSize: 65 }]),
				}),
			).toEqual(l([35, 65]));
		});

		test("should account for multiple regions with maximum size constraints", () => {
			expect(
				validateSplitLayout({
					layout: l([20, 60, 20]),
					regionConstraints: c([
						{
							maxSize: 15,
						},
						{ maxSize: 50 },
						{},
					]),
				}),
			).toEqual(l([15, 50, 35]));
		});
	});

	describe("collapsible regions", () => {
		test("should not collapse a region that's at or above the minimum size", () => {
			expect(
				validateSplitLayout({
					layout: l([25, 75]),
					regionConstraints: c([
						{ collapsible: true, minSize: 25 },
						{},
					]),
				}),
			).toEqual(l([25, 75]));
		});

		test("should collapse a region once it drops below the halfway point between collapsed and minimum percentage sizes", () => {
			expect(
				validateSplitLayout({
					layout: l([15, 85]),
					regionConstraints: c([
						{
							collapsible: true,
							collapsedSize: 10,
							minSize: 20,
						},
						{},
					]),
				}),
			).toEqual(l([20, 80]));

			expect(
				validateSplitLayout({
					layout: l([14, 86]),
					regionConstraints: c([
						{
							collapsible: true,
							collapsedSize: 10,
							minSize: 20,
						},
						{},
					]),
				}),
			).toEqual(l([10, 90]));
		});
	});
});
