import { describe, expect, test } from "bun:test";

import {
	CARD_DEMO_NOTE_KINDS,
	CARD_DEMO_VARIANTS,
	isInsideCardDemoCancelZone,
} from "../src/playground/card-demo/card-demo-contract";
import {
	CARD_DEMO_FAKE_SENTENCE,
	CARD_DEMO_RESOLUTION_CHAIN,
} from "../src/playground/card-demo/card-demo-fixtures";
import { nextCardDemoFocusIndex } from "../src/playground/card-demo/card-demo-focus";
import {
	cardDemoHref,
	cardDemoNoteNavigation,
	cardDemoSelectedSegmentIdFromState,
	cardDemoTargetFromLocation,
} from "../src/playground/card-demo/card-demo-navigation";

describe("card-demo shared contract", () => {
	test("keeps the lorem fixture explicit, stable, and Segment-shaped", () => {
		expect(CARD_DEMO_FAKE_SENTENCE.disclaimer).toContain("Fake playground");
		expect(CARD_DEMO_FAKE_SENTENCE.segments.length).toBeGreaterThan(10);
		expect(
			new Set(
				CARD_DEMO_FAKE_SENTENCE.segments.map((segment) => segment.id),
			).size,
		).toBe(CARD_DEMO_FAKE_SENTENCE.segments.length);
		expect(
			CARD_DEMO_FAKE_SENTENCE.segments.every(
				(segment, ordinal) =>
					segment.ordinal === ordinal &&
					segment.text.trim().split(/\s+/).length === 1,
			),
		).toBe(true);
	});

	test("fixes one four-card presentation order for every variant", () => {
		expect(CARD_DEMO_RESOLUTION_CHAIN.map((card) => card.kind)).toEqual(
			CARD_DEMO_NOTE_KINDS,
		);
		expect(
			CARD_DEMO_RESOLUTION_CHAIN.map((card) => card.presentationLayer),
		).toEqual([0, 1, 2, 3]);
	});

	test("round trips every Text and matching Note route without production targets", () => {
		for (const variant of CARD_DEMO_VARIANTS) {
			const textTarget = { page: "text", variant } as const;
			expect(
				cardDemoTargetFromLocation({
					pathname: cardDemoHref(textTarget),
					search: "",
				}),
			).toEqual(textTarget);
			for (const noteKind of CARD_DEMO_NOTE_KINDS) {
				const noteTarget = { page: "note", variant, noteKind } as const;
				expect(
					cardDemoTargetFromLocation({
						pathname: cardDemoHref(noteTarget),
						search: "",
					}),
				).toEqual(noteTarget);
			}
		}
	});

	test("rejects unknown variants, note kinds, trailing slashes, and queries", () => {
		for (const location of [
			{ pathname: "/playground/card-demo/unknown/text", search: "" },
			{
				pathname: "/playground/card-demo/native/note/shadow",
				search: "",
			},
			{ pathname: "/playground/card-demo/native/text/", search: "" },
			{ pathname: "/playground/card-demo/native/text", search: "?x=1" },
		]) {
			expect(cardDemoTargetFromLocation(location)).toBeNull();
		}
	});

	test("treats the stack footprint boundary as part of the cancel zone", () => {
		const zone = { left: 10, top: 20, right: 330, bottom: 238 };
		expect(isInsideCardDemoCancelZone({ x: 10, y: 238 }, zone)).toBe(true);
		expect(isInsideCardDemoCancelZone({ x: 9, y: 238 }, zone)).toBe(false);
		expect(isInsideCardDemoCancelZone({ x: 331, y: 100 }, zone)).toBe(
			false,
		);
	});

	test("carries the selected fake Segment to the matching Note route", () => {
		const navigation = cardDemoNoteNavigation(
			"motion",
			"lemma",
			"playground-segment-03",
		);
		expect(navigation.to).toBe("/playground/card-demo/motion/note/lemma");
		expect(cardDemoSelectedSegmentIdFromState(navigation.state)).toBe(
			"playground-segment-03",
		);
	});

	test("wraps modal focus in both directions", () => {
		expect(nextCardDemoFocusIndex(3, 4, false)).toBe(0);
		expect(nextCardDemoFocusIndex(0, 4, true)).toBe(3);
		expect(nextCardDemoFocusIndex(-1, 4, false)).toBe(0);
	});
});
