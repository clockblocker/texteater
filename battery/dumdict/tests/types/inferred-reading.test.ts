import { describe, expect, it } from "bun:test";
import { inferredType } from "prinfer/testing";

import type {
	DumdictReadingDraft,
	ReadingCandidate,
	ReadingEntry,
} from "../../src";

type GermanVerb = {
	lemma: { language: "de"; family: "Lexeme"; kind: "VERB" };
};

export type GermanVerbDraftReading = Extract<
	DumdictReadingDraft<"de">["reading"],
	GermanVerb
>;

export type GermanVerbStoredReading = Extract<
	ReadingEntry<"de">["reading"],
	GermanVerb
>;

export type GermanVerbCandidateReading = Extract<
	ReadingCandidate<"de">["reading"],
	GermanVerb
>;

const germanVerbReading = `{ lemma: { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }; emojiDescription: string; }`;

describe("Dumdict Reading inference", () => {
	it("preserves the selected branch at the draft ingress", () => {
		expect(
			inferredType(import.meta.url, { name: "GermanVerbDraftReading" }),
		).toBe(`type GermanVerbDraftReading = ${germanVerbReading}`);
	}, 30_000);

	it("preserves the selected branch in stored entries", () => {
		expect(
			inferredType(import.meta.url, { name: "GermanVerbStoredReading" }),
		).toBe(`type GermanVerbStoredReading = ${germanVerbReading}`);
	}, 30_000);

	it("preserves the selected branch in lookup candidates", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbCandidateReading",
			}),
		).toBe(`type GermanVerbCandidateReading = ${germanVerbReading}`);
	}, 30_000);
});
