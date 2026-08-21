import { describe, expect, it } from "bun:test";
import { dumling, readingFingerprint } from "../../src";
import { readingSchema } from "../../src/schema";
import type { Reading } from "../../src/types";

const lemma = dumling.de.create.lemma({
	canonicalForm: "Haus",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: { gender: "Neut", hyph: null },
});

describe("Reading", () => {
	it("parses one to four RGI emoji graphemes and normalizes the description", () => {
		for (const [input, expected] of [
			["  \u2764\uFE0F  ", "\u2764\uFE0F"],
			[
				"  \u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}\u{1F3E0}\u{1F3E2}\u{1F3E6}  ",
				"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}\u{1F3E0}\u{1F3E2}\u{1F3E6}",
			],
		] as const) {
			const parsed = readingSchema.parse({
				lemma,
				emojiDescription: input,
			});

			expect(parsed).toEqual({ lemma, emojiDescription: expected });
			expect(parsed.lemma.language).toBe("de");
			parsed satisfies Reading;
		}
	});

	it("rejects invalid Lemmas, empty descriptions, and host persistence fields", () => {
		expect(
			readingSchema.safeParse({ lemma, emojiDescription: "   " }).success,
		).toBe(false);
		expect(
			readingSchema.safeParse({
				lemma: { ...lemma, language: "fr" },
				emojiDescription: "\u{1F3E0}",
			}).success,
		).toBe(false);
		expect(
			readingSchema.safeParse({
				lemma,
				emojiDescription: "\u{1F3E0}",
				id: "host-document-id",
			}).success,
		).toBe(false);
	});

	it("rejects prose and more than four emoji graphemes", () => {
		expect(
			readingSchema.safeParse({
				lemma,
				emojiDescription: "house \u{1F3E0}",
			}).success,
		).toBe(false);
		expect(
			readingSchema.safeParse({
				lemma,
				emojiDescription:
					"\u{1F3E0}\u{1F3E2}\u{1F3E6}\u{1F3EB}\u{1F3E5}",
			}).success,
		).toBe(false);
	});

	it("preserves the established stable fingerprint bytes", () => {
		const reorderedLemma = {
			kind: lemma.kind,
			language: lemma.language,
			family: lemma.family,
			coreFeatures: { hyph: null, gender: "Neut" as const },
			canonicalForm: lemma.canonicalForm,
		};

		expect(
			readingFingerprint({
				lemma,
				emojiDescription: "  \u{1F3E0}  ",
			}),
		).toBe(
			readingFingerprint({
				lemma: reorderedLemma,
				emojiDescription: "\u{1F3E0}",
			}),
		);
		expect(
			String(
				readingFingerprint({ lemma, emojiDescription: "\u{1F3E0}" }),
			),
		).toBe(
			'[{"canonicalForm":"Haus","coreFeatures":{"gender":"Neut","hyph":null},"family":"Lexeme","kind":"NOUN","language":"de"},"\u{1F3E0}"]',
		);
	});
});
