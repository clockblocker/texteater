import { describe, expect, test } from "bun:test";

import { CARD_DEMO_GEOMETRY } from "../src/playground/card-demo/card-demo-contract";
import {
	isNativeCardDemoDoubleTap,
	isNativeCardDemoDragActive,
	NATIVE_CARD_DEMO_DOUBLE_TAP_WINDOW_MS,
} from "../src/playground/card-demo/variants/native-card-demo-interaction";

describe("native card-demo interaction", () => {
	test("activates at the exact shared drag distance", () => {
		expect(
			isNativeCardDemoDragActive(
				CARD_DEMO_GEOMETRY.dragActivationDistance - 1,
				0,
			),
		).toBe(false);
		expect(
			isNativeCardDemoDragActive(
				CARD_DEMO_GEOMETRY.dragActivationDistance,
				0,
			),
		).toBe(true);
	});

	test("recognizes only a same-card touch inside the shared tap window", () => {
		const lastTap = { kind: "reading" as const, at: 1_000 };
		expect(isNativeCardDemoDoubleTap(lastTap, "reading", 1_300)).toBe(true);
		expect(
			isNativeCardDemoDoubleTap(
				lastTap,
				"reading",
				1_000 + NATIVE_CARD_DEMO_DOUBLE_TAP_WINDOW_MS + 1,
			),
		).toBe(false);
		expect(isNativeCardDemoDoubleTap(lastTap, "lemma", 1_100)).toBe(false);
	});
});
