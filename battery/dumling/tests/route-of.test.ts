import { expect, test } from "bun:test";
import { routeOf } from "dumling";
import type { Reading } from "dumling/types";

test("routeOf takes a Lemma's route as a fresh object with no other field", () => {
	const reading = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "INTJ",
			canonicalForm: "ach",
			coreFeatures: { partType: null },
		},
		emojiDescription: "😮",
	} satisfies Reading<"de", "Lexeme", "INTJ">;
	const route = routeOf(reading.lemma);
	expect(route).toEqual({ language: "de", family: "Lexeme", kind: "INTJ" });
	expect(Object.keys(route)).toEqual(["language", "family", "kind"]);
	expect(route).not.toBe(reading.lemma);
});
