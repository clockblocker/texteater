import { describe, expect, test } from "bun:test";
import { getDistanceBetweenPointAndRect } from "./getDistanceBetweenPointAndRect";

describe("getDistanceBetweenPointAndRect", () => {
	const rect = {
		bottom: 75,
		left: 25,
		right: 125,
		top: 25,
	} as DOMRectReadOnly;

	test("should report the distance between the nearest border and an external point", () => {
		expect(getDistanceBetweenPointAndRect({ x: 5, y: 10 }, rect)).toEqual({
			x: 20,
			y: 15,
		});

		expect(
			getDistanceBetweenPointAndRect({ x: 175, y: 100 }, rect),
		).toEqual({
			x: 50,
			y: 25,
		});
	});

	test("should report the distance between the nearest border and an external point alt", () => {
		expect(getDistanceBetweenPointAndRect({ x: 35, y: 10 }, rect)).toEqual({
			x: 0,
			y: 15,
		});

		expect(getDistanceBetweenPointAndRect({ x: 175, y: 75 }, rect)).toEqual(
			{
				x: 50,
				y: 0,
			},
		);
	});

	test("should report the distance between the nearest border and an internal point", () => {
		expect(getDistanceBetweenPointAndRect({ x: 35, y: 55 }, rect)).toEqual({
			x: 0,
			y: 0,
		});

		expect(getDistanceBetweenPointAndRect({ x: 110, y: 70 }, rect)).toEqual(
			{
				x: 0,
				y: 0,
			},
		);
	});
});
