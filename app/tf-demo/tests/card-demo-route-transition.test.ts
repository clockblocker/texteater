import { expect, test } from "bun:test";

import {
	CARD_DEMO_MOTION,
	cardDemoFullPageBox,
	cardDemoPrimedBox,
} from "../src/playground/card-demo/card-demo-route-transition";

test("primes a card to two-thirds of both viewport dimensions", () => {
	expect(cardDemoPrimedBox(1_200, 900)).toEqual({
		left: 200,
		top: 150,
		width: 800,
		height: 600,
	});
});

test("keeps the primed card inside a sixteen-pixel mobile margin", () => {
	expect(cardDemoPrimedBox(375, 24)).toEqual({
		left: 62.5,
		top: 12,
		width: 250,
		height: 0,
	});
});

test("the final transition box fills the viewport", () => {
	expect(cardDemoFullPageBox(1_280, 720)).toEqual({
		left: 0,
		top: 0,
		width: 1_280,
		height: 720,
	});
});

test("shared timings keep close and reverse motion quicker than expansion", () => {
	expect(CARD_DEMO_MOTION.dismiss).toBeLessThan(CARD_DEMO_MOTION.expand);
	expect(CARD_DEMO_MOTION.returnPrime).toBeLessThan(CARD_DEMO_MOTION.prime);
	expect(CARD_DEMO_MOTION.returnRest).toBeLessThan(CARD_DEMO_MOTION.prime);
	expect(CARD_DEMO_MOTION.reduced).toBeLessThanOrEqual(100);
});
