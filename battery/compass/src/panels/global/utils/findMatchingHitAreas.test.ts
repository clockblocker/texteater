import { describe, expect, test } from "bun:test";
import type { RegisteredSplit } from "../../components/split/types";
import type { MountedSplits } from "../mutable-state/splits";
import {
	across,
	down,
	fakeSplit,
	region,
	summarize,
	useDomStandIns,
} from "../test/fakeSplit";
import { findMatchingHitAreas } from "./findMatchingHitAreas";

useDomStandIns();

function mounted(...splits: RegisteredSplit[]): MountedSplits {
	return new Map(
		splits.map((split) => [
			split,
			{
				defaultLayoutDeferred: false,
				derivedRegionConstraints: [],
				splitSize: 0,
				layout: {},
				handleToRegions: new Map(),
			},
		]),
	);
}

/** Its one area covers x 95..105, y 0..100. */
const horizontal = () =>
	fakeSplit({
		children: [region("a", across(0, 100)), region("b", across(100, 100))],
	});

/** Its one area covers x 0..200, y 45..55. */
const vertical = () =>
	fakeSplit({
		orientation: "vertical",
		children: [region("c", down(0, 50)), region("d", down(50, 50))],
	});

const at = (clientX: number, clientY: number) => ({
	clientX,
	clientY,
	target: null,
});

const matchesOf = (...args: Parameters<typeof findMatchingHitAreas>) =>
	findMatchingHitAreas(...args).map(summarize);

describe("findMatchingHitAreas", () => {
	test("matches the area under the pointer", () => {
		const split = horizontal();
		const matches = findMatchingHitAreas(at(98, 50), mounted(split));

		expect(matches.map(summarize)).toEqual([
			{
				regions: ["a", "b"],
				handle: undefined,
				rect: { x: 95, y: 0, width: 10, height: 100 },
			},
		]);
		expect(matches[0]?.split).toBe(split);
	});

	test("matches a pointer on the area's edge", () => {
		expect(matchesOf(at(105, 100), mounted(horizontal()))).toHaveLength(1);
	});

	test("matches nothing beside the area", () => {
		expect(matchesOf(at(94, 50), mounted(horizontal()))).toEqual([]);
	});

	test("matches nothing beyond the area's cross-axis extent", () => {
		expect(matchesOf(at(98, 101), mounted(horizontal()))).toEqual([]);
	});

	test("skips a disabled Split", () => {
		const split = fakeSplit({
			disabled: true,
			children: [
				region("a", across(0, 100)),
				region("b", across(100, 100)),
			],
		});

		expect(matchesOf(at(98, 50), mounted(split))).toEqual([]);
	});

	test("matches one area per Split, in mount order", () => {
		const matches = matchesOf(
			at(100, 50),
			mounted(vertical(), horizontal()),
		);

		expect(matches).toEqual([
			{
				regions: ["c", "d"],
				handle: undefined,
				rect: { x: 0, y: 45, width: 200, height: 10 },
			},
			{
				regions: ["a", "b"],
				handle: undefined,
				rect: { x: 95, y: 0, width: 10, height: 100 },
			},
		]);
	});

	test("matches only the Splits whose area is under the pointer", () => {
		expect(
			matchesOf(at(150, 50), mounted(horizontal(), vertical())),
		).toEqual([
			{
				regions: ["c", "d"],
				handle: undefined,
				rect: { x: 0, y: 45, width: 200, height: 10 },
			},
		]);
	});
});
