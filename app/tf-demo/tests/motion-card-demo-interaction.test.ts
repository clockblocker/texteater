import { expect, test } from "bun:test";

import {
	CARD_DEMO_GEOMETRY,
	CARD_DEMO_KEYBOARD_ORDER,
} from "../src/playground/card-demo/card-demo-contract";
import { CARD_DEMO_RESOLUTION_CHAIN } from "../src/playground/card-demo/card-demo-fixtures";
import {
	MOTION_DOUBLE_TAP_WINDOW_MS,
	motionPointerDistance,
} from "../src/playground/card-demo/variants/motion-card-demo-interaction";

test("pins the shared Motion tap and drag thresholds", () => {
	expect(MOTION_DOUBLE_TAP_WINDOW_MS).toBe(300);
	expect(motionPointerDistance(10, 20, 13, 24)).toBe(5);
	expect(
		motionPointerDistance(
			0,
			0,
			CARD_DEMO_GEOMETRY.dragActivationDistance,
			0,
		),
	).toBe(CARD_DEMO_GEOMETRY.dragActivationDistance);
});

test("uses the shared front-to-back keyboard order", () => {
	expect(
		CARD_DEMO_RESOLUTION_CHAIN.map(({ kind }) => kind).toReversed(),
	).toEqual(CARD_DEMO_KEYBOARD_ORDER);
});
