import { afterEach, describe, expect, test } from "bun:test";
import type {
	Orientation,
	RegisteredSplit,
} from "../../components/split/types";
import {
	CURSOR_FLAG_HORIZONTAL_MAX,
	CURSOR_FLAG_HORIZONTAL_MIN,
	CURSOR_FLAG_VERTICAL_MAX,
	CURSOR_FLAG_VERTICAL_MIN,
} from "../../constants";
import { fakeSplit } from "../test/fakeSplit";
import { getCursorStyle } from "./getCursorStyle";
import { resetAdvancedCursorStylesCache } from "./supportsAdvancedCursorStyles";

const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

/** Stubs `window` with `userAgent`, so Chrome supports advanced cursors. */
function useBrowser(userAgent: "Chrome" | "Safari") {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		writable: true,
		value: { navigator: { userAgent } },
	});
	resetAdvancedCursorStylesCache();
}

afterEach(() => {
	if (savedWindow) {
		Object.defineProperty(globalThis, "window", savedWindow);
	} else {
		Reflect.deleteProperty(globalThis, "window");
	}
	resetAdvancedCursorStylesCache();
});

function split(
	orientation: Orientation,
	{ disableCursor = false }: { disableCursor?: boolean } = {},
): RegisteredSplit {
	const fake = fakeSplit({ children: [], orientation });
	fake.mutableState.disableCursor = disableCursor;
	return fake;
}

const H_MIN = CURSOR_FLAG_HORIZONTAL_MIN;
const H_MAX = CURSOR_FLAG_HORIZONTAL_MAX;
const V_MIN = CURSOR_FLAG_VERTICAL_MIN;
const V_MAX = CURSOR_FLAG_VERTICAL_MAX;

describe("getCursorStyle", () => {
	test("has no cursor while inactive", () => {
		useBrowser("Chrome");

		expect(
			getCursorStyle({
				cursorFlags: 0,
				splits: [split("horizontal")],
				state: "inactive",
			}),
		).toBeUndefined();
	});

	test("has no cursor without Splits, or when every Split disables it", () => {
		useBrowser("Chrome");

		for (const state of ["hover", "active"] as const) {
			expect(
				getCursorStyle({ cursorFlags: H_MIN, splits: [], state }),
			).toBeUndefined();
			expect(
				getCursorStyle({
					cursorFlags: H_MIN,
					splits: [
						split("horizontal", { disableCursor: true }),
						split("vertical", { disableCursor: true }),
					],
					state,
				}),
			).toBeUndefined();
		}
	});

	test("picks the resize cursor for the orientations it hovers", () => {
		const cases = [
			[["horizontal"], "ew-resize", "col-resize"],
			[["vertical"], "ns-resize", "row-resize"],
			[["horizontal", "vertical"], "move", "grab"],
			[["vertical", "vertical"], "ns-resize", "row-resize"],
		] as const;

		for (const [orientations, advanced, basic] of cases) {
			const splits = orientations.map((orientation) =>
				split(orientation),
			);
			useBrowser("Chrome");
			expect(
				getCursorStyle({ cursorFlags: 0, splits, state: "hover" }),
			).toBe(advanced);
			useBrowser("Safari");
			expect(
				getCursorStyle({ cursorFlags: 0, splits, state: "hover" }),
			).toBe(basic);
		}
	});

	test("counts only the Splits that keep their cursor", () => {
		useBrowser("Chrome");

		expect(
			getCursorStyle({
				cursorFlags: 0,
				splits: [
					split("horizontal", { disableCursor: true }),
					split("vertical"),
				],
				state: "hover",
			}),
		).toBe("ns-resize");
	});

	test("points an active resize at its limits with advanced cursors", () => {
		useBrowser("Chrome");
		const splits = [split("horizontal"), split("vertical")];
		const cases = [
			[H_MIN | V_MIN, "se-resize"],
			[H_MIN | V_MAX, "ne-resize"],
			[H_MIN, "e-resize"],
			[H_MIN | H_MAX, "e-resize"],
			[H_MAX | V_MIN, "sw-resize"],
			[H_MAX | V_MAX, "nw-resize"],
			[H_MAX, "w-resize"],
			[V_MIN, "s-resize"],
			[V_MIN | V_MAX, "s-resize"],
			[V_MAX, "n-resize"],
		] as const;

		for (const [cursorFlags, cursor] of cases) {
			expect(
				getCursorStyle({ cursorFlags, splits, state: "active" }),
			).toBe(cursor);
		}
	});

	test("an active resize without a limit flag keeps the orientation cursor", () => {
		useBrowser("Chrome");
		const splits = [split("horizontal")];

		expect(
			getCursorStyle({ cursorFlags: 0, splits, state: "active" }),
		).toBe("ew-resize");
		expect(
			getCursorStyle({ cursorFlags: 16, splits, state: "active" }),
		).toBe("ew-resize");
	});

	test("limit flags are ignored while hovering or without advanced cursors", () => {
		useBrowser("Chrome");
		expect(
			getCursorStyle({
				cursorFlags: H_MIN,
				splits: [split("horizontal")],
				state: "hover",
			}),
		).toBe("ew-resize");

		useBrowser("Safari");
		expect(
			getCursorStyle({
				cursorFlags: H_MIN | V_MAX,
				splits: [split("horizontal")],
				state: "active",
			}),
		).toBe("col-resize");
	});
});
