import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CARD_DEMO_GEOMETRY } from "../src/playground/card-demo/card-demo-contract";
import {
	CARD_DEMO_FAKE_SENTENCE,
	CARD_DEMO_RESOLUTION_CHAIN,
} from "../src/playground/card-demo/card-demo-fixtures";
import {
	MOTION_DOUBLE_TAP_WINDOW_MS,
	MotionCardDemoInteraction,
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

test("renders the shared cards in front-to-back focus order", () => {
	const markup = renderToStaticMarkup(
		createElement(MotionCardDemoInteraction, {
			cards: CARD_DEMO_RESOLUTION_CHAIN,
			selectedSegment: CARD_DEMO_FAKE_SENTENCE.segments[2],
			onOpenNote() {},
		}),
	);
	expect(markup).toContain('data-motion-version="13.1.1"');
	expect(markup.match(/data-card-demo-card=/g)).toHaveLength(4);
	expect(markup.indexOf('data-card-demo-card="reading"')).toBeLessThan(
		markup.indexOf('data-card-demo-card="lemma"'),
	);
	expect(markup.indexOf('data-card-demo-card="lemma"')).toBeLessThan(
		markup.indexOf('data-card-demo-card="surface"'),
	);
	expect(markup.indexOf('data-card-demo-card="surface"')).toBeLessThan(
		markup.indexOf('data-card-demo-card="attestation"'),
	);
	expect(markup).toContain('aria-label="Open Reading Note for dolor"');
});
