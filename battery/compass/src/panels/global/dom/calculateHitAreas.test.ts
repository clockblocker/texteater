import { describe, expect, test } from "bun:test";
import {
	across,
	down,
	fakeSplit,
	handle,
	region,
	staticContent,
	stubCoarsePointer,
	summarize,
	textNode,
	useDomStandIns,
} from "../test/fakeSplit";
import { calculateHitAreas } from "./calculateHitAreas";

useDomStandIns();

const areasOf = (split: Parameters<typeof calculateHitAreas>[0]) =>
	calculateHitAreas(split).map(summarize);

describe("calculateHitAreas", () => {
	describe("the gap between adjacent Regions", () => {
		test("covers the gap of a horizontal Split", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					region("b", across(120, 100)),
				],
			});
			const hitAreas = calculateHitAreas(split);

			expect(hitAreas.map(summarize)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 0, width: 20, height: 100 },
				},
			]);
			const [hitArea] = hitAreas;
			expect(hitArea?.split).toBe(split);
			expect(hitArea?.regions[0]).toBe(split.regions[0]);
			expect(hitArea?.regions[1]).toBe(split.regions[1]);
			expect(hitArea?.splitSize).toBe(200);
			expect(hitArea?.rightToLeft).toBe(false);
		});

		test("pairs each Region with the next by offset, not DOM order", () => {
			const split = fakeSplit({
				children: [
					region("c", across(240, 100)),
					region("a", across(0, 100)),
					region("b", across(120, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 0, width: 20, height: 100 },
				},
				{
					regions: ["b", "c"],
					handle: undefined,
					rect: { x: 220, y: 0, width: 20, height: 100 },
				},
			]);
		});

		test("takes the gap's cross-axis extent from the later Region", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100, 0, 100)),
					region("b", across(120, 100, 10, 50)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 10, width: 20, height: 50 },
				},
			]);
		});

		test("covers the gap of a vertical Split, sized by heights", () => {
			const split = fakeSplit({
				orientation: "vertical",
				children: [
					region("a", down(0, 100)),
					region("b", down(120, 150)),
				],
			});
			const hitAreas = calculateHitAreas(split);

			expect(hitAreas.map(summarize)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 0, y: 100, width: 200, height: 20 },
				},
			]);
			expect(hitAreas[0]?.splitSize).toBe(250);
			expect(hitAreas[0]?.rightToLeft).toBe(false);
		});

		test('runs a horizontal Split right to left under dir="rtl"', () => {
			const split = fakeSplit({
				direction: "rtl",
				children: [
					region("a", across(120, 100)),
					region("b", across(0, 100)),
				],
			});
			const hitAreas = calculateHitAreas(split);

			expect(hitAreas.map(summarize)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 0, width: 20, height: 100 },
				},
			]);
			expect(hitAreas[0]?.rightToLeft).toBe(true);
		});

		test('keeps a vertical Split top to bottom under dir="rtl"', () => {
			const split = fakeSplit({
				orientation: "vertical",
				direction: "rtl",
				children: [
					region("a", down(0, 100)),
					region("b", down(120, 150)),
				],
			});
			const hitAreas = calculateHitAreas(split);

			expect(hitAreas.map(summarize)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 0, y: 100, width: 200, height: 20 },
				},
			]);
			expect(hitAreas[0]?.rightToLeft).toBe(false);
		});
	});

	describe("explicit Handles", () => {
		test("watches a Handle instead of the gap", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h", across(100, 4)),
					region("b", across(104, 100)),
				],
			});
			const hitAreas = calculateHitAreas(split);

			expect(hitAreas.map(summarize)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h",
					rect: { x: 97, y: 0, width: 10, height: 100 },
				},
			]);
			expect(hitAreas[0]?.handle).toBe(split.handles[0]);
		});

		test("watches every Handle between the same two Regions", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h1", across(100, 4)),
					handle("h2", across(104, 4)),
					region("b", across(108, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h1",
					rect: { x: 97, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["a", "b"],
					handle: "h2",
					rect: { x: 101, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("pairs each Handle with the Regions on either side of it", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h1", across(100, 4)),
					region("b", across(104, 100)),
					handle("h2", across(204, 4)),
					region("c", across(208, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h1",
					rect: { x: 97, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["b", "c"],
					handle: "h2",
					rect: { x: 201, y: 0, width: 10, height: 100 },
				},
			]);
		});
	});

	describe("static content between Regions", () => {
		test("watches the two Region edges facing it", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					staticContent(across(100, 50)),
					region("b", across(150, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 95, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 145, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test('takes the inline-end and inline-start edges under dir="rtl"', () => {
			const split = fakeSplit({
				direction: "rtl",
				children: [
					region("a", across(150, 100)),
					staticContent(across(100, 50)),
					region("b", across(0, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 145, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 95, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("takes the bottom and top edges of a vertical Split", () => {
			const split = fakeSplit({
				orientation: "vertical",
				children: [
					region("a", down(0, 100)),
					staticContent(down(100, 50)),
					region("b", down(150, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 0, y: 95, width: 200, height: 10 },
				},
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 0, y: 145, width: 200, height: 10 },
				},
			]);
		});

		test("watches one Handle and the far edge when the Handle sits by the previous Region", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h", across(100, 4)),
					staticContent(across(104, 46)),
					region("b", across(150, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h",
					rect: { x: 97, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 145, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("watches one Handle and the far edge when the Handle sits by the next Region", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					staticContent(across(100, 46)),
					handle("h", across(146, 4)),
					region("b", across(150, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h",
					rect: { x: 143, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 95, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("counts a Handle midway as by the previous Region", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					staticContent(across(100, 23)),
					handle("h", across(123, 4)),
					staticContent(across(127, 23)),
					region("b", across(150, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h",
					rect: { x: 120, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 145, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("watches only the Handles when there are several", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h1", across(100, 4)),
					staticContent(across(104, 42)),
					handle("h2", across(146, 4)),
					region("b", across(150, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h1",
					rect: { x: 97, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["a", "b"],
					handle: "h2",
					rect: { x: 143, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("ignores content before the first Region and after the last", () => {
			const split = fakeSplit({
				children: [
					staticContent(across(0, 20)),
					region("a", across(20, 100)),
					region("b", across(120, 100)),
					staticContent(across(220, 20)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 115, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("does not count a child that is not an element as content", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					textNode(),
					region("b", across(120, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 0, width: 20, height: 100 },
				},
			]);
		});
	});

	describe("a disabled Handle", () => {
		test("suppresses the area of an aria-disabled Handle", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h1", across(100, 4), { ariaDisabled: true }),
					region("b", across(104, 100)),
					handle("h2", across(204, 4)),
					region("c", across(208, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["b", "c"],
					handle: "h2",
					rect: { x: 201, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("suppresses the Region edge past static content too", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					staticContent(across(100, 46)),
					handle("h", across(146, 4), { ariaDisabled: true }),
					region("b", across(150, 100)),
				],
			});

			expect(areasOf(split)).toEqual([]);
		});

		test("suppresses every Handle between its two Regions", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h1", across(100, 4)),
					handle("h2", across(104, 4), { ariaDisabled: true }),
					region("b", across(108, 100)),
				],
			});

			expect(areasOf(split)).toEqual([]);
		});

		test("locks only its own pair when the next pair has several Handles", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h1", across(100, 4), { ariaDisabled: true }),
					region("b", across(104, 100)),
					handle("h2", across(204, 4)),
					handle("h3", across(208, 4)),
					region("c", across(212, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["b", "c"],
					handle: "h2",
					rect: { x: 201, y: 0, width: 10, height: 100 },
				},
				{
					regions: ["b", "c"],
					handle: "h3",
					rect: { x: 205, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("is forgotten when an unregistered Handle resets the walk", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("x", across(100, 4), {
						ariaDisabled: true,
						registered: false,
					}),
					region("b", across(104, 100)),
					region("c", across(220, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["b", "c"],
					handle: undefined,
					rect: { x: 204, y: 0, width: 16, height: 100 },
				},
			]);
		});

		test("before the first Region locks nothing", () => {
			const split = fakeSplit({
				children: [
					handle("h0", across(0, 4), { ariaDisabled: true }),
					region("a", across(4, 100)),
					region("b", across(124, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 104, y: 0, width: 20, height: 100 },
				},
			]);
		});
	});

	describe("disabled Regions", () => {
		test("skips the area before the first enabled Region", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100), { disabled: true }),
					region("b", across(120, 100)),
					region("c", across(240, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["b", "c"],
					handle: undefined,
					rect: { x: 220, y: 0, width: 20, height: 100 },
				},
			]);
		});

		test("skips the area after the last enabled Region", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					region("b", across(120, 100)),
					region("c", across(240, 100), { disabled: true }),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 0, width: 20, height: 100 },
				},
			]);
		});

		test("skips the areas outside the enabled Regions at both ends", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100), { disabled: true }),
					handle("h1", across(100, 4)),
					region("b", across(104, 100)),
					handle("h2", across(204, 4)),
					region("c", across(208, 100)),
					handle("h3", across(308, 4)),
					region("d", across(312, 100), { disabled: true }),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["b", "c"],
					handle: "h2",
					rect: { x: 201, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("keeps both areas beside a disabled Region between enabled ones", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					region("b", across(120, 100), { disabled: true }),
					region("c", across(240, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 0, width: 20, height: 100 },
				},
				{
					regions: ["b", "c"],
					handle: undefined,
					rect: { x: 220, y: 0, width: 20, height: 100 },
				},
			]);
		});
	});

	describe("fewer than two enabled Regions", () => {
		test("gives no areas for an empty Split", () => {
			expect(areasOf(fakeSplit({ children: [] }))).toEqual([]);
		});

		test("gives no areas for a single Region", () => {
			expect(
				areasOf(fakeSplit({ children: [region("a", across(0, 100))] })),
			).toEqual([]);
		});

		test("gives no areas when all but one Region are disabled", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100), { disabled: true }),
					handle("h1", across(100, 4)),
					region("b", across(104, 100)),
					handle("h2", across(204, 4)),
					region("c", across(208, 100), { disabled: true }),
				],
			});

			expect(areasOf(split)).toEqual([]);
		});
	});

	describe("unregistered children", () => {
		test("an unregistered Handle ends the walk, so its two Regions get no area", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("x", across(100, 4), { registered: false }),
					region("b", across(104, 100)),
					region("c", across(224, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["b", "c"],
					handle: undefined,
					rect: { x: 204, y: 0, width: 20, height: 100 },
				},
			]);
		});

		test("an unregistered Handle drops the Handles seen before it", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h", across(100, 4)),
					handle("x", across(104, 4), { registered: false }),
					region("b", across(108, 100)),
				],
			});

			expect(areasOf(split)).toEqual([]);
		});

		test("an unregistered Region is walked past, keeping the Handles before it", () => {
			const split = fakeSplit({
				unregisteredRegions: ["x"],
				children: [
					region("a", across(0, 100)),
					handle("h", across(100, 4)),
					region("x", across(104, 50)),
					region("b", across(154, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h",
					rect: { x: 97, y: 0, width: 10, height: 100 },
				},
			]);
		});
	});

	describe("growth to the minimum hit target size", () => {
		test("grows a zero-width gap to resizeTargetMinimumSize.fine around its centre", () => {
			const split = fakeSplit({
				fine: 24,
				coarse: 50,
				children: [
					region("a", across(0, 100)),
					region("b", across(100, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 88, y: 0, width: 24, height: 100 },
				},
			]);
		});

		test("leaves a rect exactly the minimum size as it is", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					region("b", across(110, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 0, width: 10, height: 100 },
				},
			]);
		});

		test("grows a small Handle in both axes", () => {
			const split = fakeSplit({
				children: [
					region("a", across(0, 100)),
					handle("h", across(100, 4, 40, 6)),
					region("b", across(104, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: "h",
					rect: { x: 97, y: 38, width: 10, height: 10 },
				},
			]);
		});

		test("grows a gap to resizeTargetMinimumSize.coarse on a coarse pointer", () => {
			const pointer = stubCoarsePointer(true);
			try {
				const split = fakeSplit({
					fine: 24,
					coarse: 50,
					children: [
						region("a", across(0, 100)),
						region("b", across(100, 100)),
					],
				});

				expect(areasOf(split)).toEqual([
					{
						regions: ["a", "b"],
						handle: undefined,
						rect: { x: 75, y: 0, width: 50, height: 100 },
					},
				]);
			} finally {
				pointer.restore();
			}
		});

		test("grows nothing when the minimum is zero", () => {
			const split = fakeSplit({
				fine: 0,
				children: [
					region("a", across(0, 100)),
					region("b", across(100, 100)),
				],
			});

			expect(areasOf(split)).toEqual([
				{
					regions: ["a", "b"],
					handle: undefined,
					rect: { x: 100, y: 0, width: 0, height: 100 },
				},
			]);
		});
	});
});
