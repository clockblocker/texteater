import { afterAll, describe, expect, it } from "bun:test";
import { closeTestingSessions, inferredType } from "prinfer/testing";

import type {
	DumdictReadingDraft,
	ReadingCandidate,
	ReadingEntry,
} from "../../src";

afterAll(closeTestingSessions);

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

const germanVerbReading = `{ lemma: { canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; family: "Lexeme"; kind: "VERB"; language: "de"; }; emojiDescription: string; }`;

describe("Dumdict Reading inference", () => {
	it("preserves the selected branch at the draft ingress", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbDraftReading",
				backend: "typescript7",
			}),
		).toBe(`type GermanVerbDraftReading = ${germanVerbReading}`);
	}, 30_000);

	it("preserves the selected branch in stored entries", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbStoredReading",
				backend: "typescript7",
			}),
		).toBe(`type GermanVerbStoredReading = ${germanVerbReading}`);
	}, 30_000);

	it("preserves the selected branch in lookup candidates", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbCandidateReading",
				backend: "typescript7",
			}),
		).toBe(`type GermanVerbCandidateReading = ${germanVerbReading}`);
	}, 30_000);
});
