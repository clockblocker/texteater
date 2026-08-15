import { describe, expect, test } from "bun:test";

import {
	lemmaKeyFor,
	readingKeyFor,
	resolutionKeyFor,
	visitorContextKeyFor,
} from "../convex/model/linguisticKeys";

describe("global linguistic and visitor-scoped identities", () => {
	test("global linguistic keys do not contain a visitor identity", () => {
		const lemma = {
			language: "de",
			canonicalForm: "Haus",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: { gender: "Neuter" },
		};
		const lemmaKey = lemmaKeyFor(lemma);
		const readingKey = readingKeyFor({ lemma, emojiDescription: "🏠" });
		const resolutionKey = resolutionKeyFor("sentence-1", [2]);

		expect(lemmaKey).not.toContain("visitor-a");
		expect(readingKey).not.toContain("visitor-a");
		expect(resolutionKey).not.toContain("visitor-a");
		expect(lemmaKeyFor({ ...lemma })).toBe(lemmaKey);
	});

	test("the same click occurrence is isolated between visitors", () => {
		const first = visitorContextKeyFor("visitor-a", "sentence-1", 2);
		const second = visitorContextKeyFor("visitor-b", "sentence-1", 2);

		expect(first).not.toBe(second);
		expect(first).toBe(visitorContextKeyFor("visitor-a", "sentence-1", 2));
	});

	test("Reading identity follows Dumdict normalization", () => {
		const lemma = {
			canonicalForm: "Haus",
			coreFeatures: { gender: "Neuter" },
			family: "Lexeme",
			kind: "NOUN",
			language: "de",
		};

		expect(readingKeyFor({ lemma, emojiDescription: "  🏠  " })).toBe(
			readingKeyFor({ lemma, emojiDescription: "🏠" }),
		);
	});
});
