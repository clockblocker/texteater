import { afterAll, describe, expect, it } from "bun:test";
import { closeTestingSessions, inferredType } from "prinfer/testing";

import type { ReadingEntry } from "../../src";
import type { DumdictReadingDraft } from "../../src/dto/drafts";

afterAll(closeTestingSessions);

type GermanVerb = {
	lemma: { language: "de"; family: "Lexeme"; kind: "VERB" };
};

type _GermanVerbDraftReading = Extract<
	DumdictReadingDraft<"de">["reading"],
	GermanVerb
>;

type _GermanVerbStoredReading = Extract<
	ReadingEntry<"de">["reading"],
	GermanVerb
>;

const germanVerbReading = `{ unitKind: "Reading"; lemma: { unitKind: "Lemma"; language: "de"; family: "Lexeme"; kind: "VERB"; canonicalForm: string; coreFeatures: { hasSepPrefix: string | null; lexicallyReflexive: "Acc" | "Dat" | null; }; }; emojiDescription: string; }`;

describe("Dumdict Reading inference", () => {
	it("preserves the selected branch at the draft ingress", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "_GermanVerbDraftReading",
				backend: "typescript7",
			}),
		).toBe(`type _GermanVerbDraftReading = ${germanVerbReading}`);
	}, 30_000);

	it("preserves the selected branch in stored entries", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "_GermanVerbStoredReading",
				backend: "typescript7",
			}),
		).toBe(`type _GermanVerbStoredReading = ${germanVerbReading}`);
	}, 30_000);
});
