import { describe, expect, test } from "bun:test";
import {
	backTransform,
	DEFAULT_TURN,
	frontOpacity,
	sideAt,
	turnTarget,
	turnTransform,
} from "./card-turn";

describe("sideAt", () => {
	test("shows the front until the Card is edge on, then the back", () => {
		expect(sideAt(0)).toBe("front");
		expect(sideAt(90)).toBe("front");
		expect(sideAt(91)).toBe("back");
		expect(sideAt(180)).toBe("back");
		expect(sideAt(269)).toBe("back");
		expect(sideAt(271)).toBe("front");
		expect(sideAt(360)).toBe("front");
	});

	test("reads any number of rounds, either way", () => {
		expect(sideAt(540)).toBe("back");
		expect(sideAt(-180)).toBe("back");
		expect(sideAt(-360)).toBe("front");
	});
});

describe("turnTarget", () => {
	test("turns a resting Card on by half a round, always the same way", () => {
		expect(turnTarget(180, 180, "front")).toBe(360);
		expect(turnTarget(360, 360, "back")).toBe(540);
		expect(turnTarget(0, 0, "back")).toBe(180);
	});

	test("leaves a Card that rests on or is headed to the side", () => {
		expect(turnTarget(180, 180, "back")).toBe(180);
		expect(turnTarget(250, 360, "front")).toBe(360);
	});

	test("turns a Card back where it came from when reversed mid-turn", () => {
		expect(turnTarget(200, 360, "back")).toBe(180);
		expect(turnTarget(300, 360, "back")).toBe(180);
	});
});

describe("turnTransform", () => {
	const feel = DEFAULT_TURN;

	test("turns about the axis in the feel's perspective, flat at rest", () => {
		expect(turnTransform(180, feel, false)).toBe(
			"perspective(600px) rotateY(180deg) scale(1)",
		);
		expect(turnTransform(0, { ...feel, axis: "x" }, false)).toBe(
			"perspective(600px) rotateX(0deg) scale(1)",
		);
	});

	test("swells by the lift edge on", () => {
		expect(turnTransform(90, { ...feel, lift: 0.1 }, false)).toBe(
			"perspective(600px) rotateY(90deg) scale(1.1)",
		);
	});

	test("stays flat under reduced motion", () => {
		expect(turnTransform(90, feel, true)).toBe("none");
		expect(backTransform(feel, true)).toBe("none");
	});

	test("turns the back half round on the same axis", () => {
		expect(backTransform(feel, false)).toBe("rotateY(180deg)");
		expect(backTransform({ ...feel, axis: "x" }, false)).toBe(
			"rotateX(180deg)",
		);
	});
});

describe("frontOpacity", () => {
	test("is solid while the Card turns in 3D", () => {
		expect(frontOpacity(90, false)).toBe(1);
	});

	test("crossfades from face up to face down under reduced motion", () => {
		expect(frontOpacity(0, true)).toBe(1);
		expect(frontOpacity(90, true)).toBeCloseTo(0.5, 10);
		expect(frontOpacity(180, true)).toBe(0);
		expect(frontOpacity(360, true)).toBe(1);
	});
});
