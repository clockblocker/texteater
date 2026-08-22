import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	CARD_DEMO_GEOMETRY,
	CARD_DEMO_KEYBOARD_ORDER,
} from "../src/playground/card-demo/card-demo-contract";
import {
	CARD_DEMO_FAKE_SENTENCE,
	CARD_DEMO_RESOLUTION_CHAIN,
} from "../src/playground/card-demo/card-demo-fixtures";
import {
	canStartDndKitCardDemoPointer,
	DND_KIT_DOUBLE_TAP_WINDOW_MS,
	DND_KIT_SENSOR_ACTIVATION_DISTANCE,
	DndKitCardDemoInteraction,
	isDndKitCardDemoDirectOpenKey,
	isDndKitCardDemoDoubleTap,
	isDndKitCardDemoOutsideCancelZone,
} from "../src/playground/card-demo/variants/dnd-kit-card-demo-interaction";

describe("dnd-kit card-demo adapter", () => {
	test("renders the shared four-card chain in natural keyboard order", () => {
		const markup = renderToStaticMarkup(
			createElement(DndKitCardDemoInteraction, {
				cards: CARD_DEMO_RESOLUTION_CHAIN,
				selectedSegment: CARD_DEMO_FAKE_SENTENCE.segments[2],
				onOpenNote() {},
			}),
		);
		expect(markup).toContain('data-card-demo-dnd-kit=""');
		let previousIndex = -1;
		for (const kind of CARD_DEMO_KEYBOARD_ORDER) {
			const currentIndex = markup.indexOf(
				`data-card-demo-card="${kind}"`,
			);
			expect(currentIndex).toBeGreaterThan(previousIndex);
			previousIndex = currentIndex;
		}
		expect(markup.match(/data-card-demo-card=/g)?.length).toBe(4);
	});

	test("adapts dnd-kit's strict check to exactly the inclusive shared threshold", () => {
		const bits = new DataView(new ArrayBuffer(8));
		bits.setFloat64(0, CARD_DEMO_GEOMETRY.dragActivationDistance);
		const thresholdBits = bits.getBigUint64(0);
		bits.setFloat64(0, DND_KIT_SENSOR_ACTIVATION_DISTANCE);
		expect(bits.getBigUint64(0)).toBe(thresholdBits - 1n);
		expect(5.5 > DND_KIT_SENSOR_ACTIVATION_DISTANCE).toBe(false);
		expect(6 > DND_KIT_SENSOR_ACTIVATION_DISTANCE).toBe(true);
	});

	test("uses the shared inclusive cancel-zone predicate at one-pixel boundaries", () => {
		const zone = { left: 10, top: 20, right: 330, bottom: 238 };
		expect(isDndKitCardDemoOutsideCancelZone({ x: 10, y: 238 }, zone)).toBe(
			false,
		);
		expect(isDndKitCardDemoOutsideCancelZone({ x: 9, y: 238 }, zone)).toBe(
			true,
		);
		expect(
			isDndKitCardDemoOutsideCancelZone({ x: 331, y: 100 }, zone),
		).toBe(true);
	});

	test("keeps direct keyboard opening separate from pointer dragging", () => {
		expect(isDndKitCardDemoDirectOpenKey("Enter")).toBe(true);
		expect(isDndKitCardDemoDirectOpenKey(" ")).toBe(true);
		expect(isDndKitCardDemoDirectOpenKey("Enter", true)).toBe(false);
		expect(isDndKitCardDemoDirectOpenKey(" ", true)).toBe(false);
		expect(isDndKitCardDemoDirectOpenKey("ArrowRight")).toBe(false);
	});

	test("admits only one primary pointer session and left-button mouse", () => {
		const primaryTouch = {
			button: 0,
			isPrimary: true,
			pointerType: "touch",
		};
		expect(canStartDndKitCardDemoPointer(false, primaryTouch)).toBe(true);
		expect(canStartDndKitCardDemoPointer(true, primaryTouch)).toBe(false);
		expect(
			canStartDndKitCardDemoPointer(false, {
				...primaryTouch,
				isPrimary: false,
			}),
		).toBe(false);
		expect(
			canStartDndKitCardDemoPointer(false, {
				button: 2,
				isPrimary: true,
				pointerType: "mouse",
			}),
		).toBe(false);
	});

	test("opens only the same card's second touch tap inside 300 ms", () => {
		expect(DND_KIT_DOUBLE_TAP_WINDOW_MS).toBe(300);
		const first = { kind: "reading", endedAt: 1_000 } as const;
		expect(isDndKitCardDemoDoubleTap(null, "reading", 1_100)).toBe(false);
		expect(isDndKitCardDemoDoubleTap(first, "lemma", 1_100)).toBe(false);
		expect(isDndKitCardDemoDoubleTap(first, "reading", 1_300)).toBe(true);
		expect(isDndKitCardDemoDoubleTap(first, "reading", 1_301)).toBe(false);
	});
});
