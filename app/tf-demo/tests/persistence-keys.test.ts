import { describe, expect, test } from "bun:test";
import {
	lemmaIdentityKey,
	readingIdentityKey as readingFingerprint,
} from "../server/linguisticIdentity";

describe("global linguistic and visitor-scoped identities", () => {
	test("global linguistic keys do not contain a visitor identity", () => {
		const lemma = {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Haus",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: { gender: "Neut", hyph: null },
		} as const;
		const lemmaKey = lemmaIdentityKey(lemma);
		const readingKey = readingFingerprint({
			unitKind: "Reading",
			lemma,
			emojiDescription: "🏠",
		});

		expect(lemmaKey).not.toContain("visitor-a");
		expect(readingKey).not.toContain("visitor-a");
		expect(lemmaKey).toBe(
			'{"canonicalForm":"Haus","coreFeatures":{"gender":"Neut","hyph":null},"family":"Lexeme","kind":"NOUN","language":"de","unitKind":"Lemma"}',
		);
		expect(lemmaIdentityKey({ ...lemma })).toBe(lemmaKey);
	});

	test("Reading identity follows Dumling normalization", () => {
		const lemma = {
			unitKind: "Lemma",
			canonicalForm: "Haus",
			coreFeatures: { gender: "Neut", hyph: null },
			family: "Lexeme",
			kind: "NOUN",
			language: "de",
		} as const;

		expect(
			readingFingerprint({
				unitKind: "Reading",
				lemma,
				emojiDescription: "  🏠  ",
			}),
		).toBe(
			readingFingerprint({
				unitKind: "Reading",
				lemma,
				emojiDescription: "🏠",
			}),
		);
	});
});
