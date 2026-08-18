import { describe, expect, test } from "bun:test";
import { readingFingerprint } from "dumling";

import { lemmaKeyFor } from "../convex/model/linguisticKeys";

describe("global linguistic and visitor-scoped identities", () => {
	test("global linguistic keys do not contain a visitor identity", () => {
		const lemma = {
			language: "de",
			canonicalForm: "Haus",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: { gender: "Neut", hyph: null },
		} as const;
		const lemmaKey = lemmaKeyFor(lemma);
		const readingKey = readingFingerprint({
			lemma,
			emojiDescription: "🏠",
		});

		expect(lemmaKey).not.toContain("visitor-a");
		expect(readingKey).not.toContain("visitor-a");
		expect(lemmaKeyFor({ ...lemma })).toBe(lemmaKey);
	});

	test("Reading identity follows Dumling normalization", () => {
		const lemma = {
			canonicalForm: "Haus",
			coreFeatures: { gender: "Neut", hyph: null },
			family: "Lexeme",
			kind: "NOUN",
			language: "de",
		} as const;

		expect(readingFingerprint({ lemma, emojiDescription: "  🏠  " })).toBe(
			readingFingerprint({ lemma, emojiDescription: "🏠" }),
		);
	});
});
