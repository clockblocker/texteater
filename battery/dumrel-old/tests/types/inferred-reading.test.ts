import { afterAll, describe, expect, it } from "bun:test";
import { closeTestingSessions, inferredType } from "prinfer/testing";

import type {
	ReadingGrammaticalRelationClaim,
	ReadingReference,
} from "../../src/types";

afterAll(closeTestingSessions);

export type GermanVerbReadingReference = Extract<
	ReadingReference<"de">,
	{ lemma: { language: "de"; family: "Lexeme"; kind: "VERB" } }
>;

export type GermanVerbReadingRelationClaim =
	ReadingGrammaticalRelationClaim<GermanVerbReadingReference>;

describe("Dumrel Reading inference", () => {
	it("preserves the selected branch at the Reading reference boundary", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbReadingReference",
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingReference = { lemma: { canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; family: "Lexeme"; kind: "VERB"; language: "de"; }; emojiDescription: string; }"`,
		);
	}, 30_000);

	it("preserves the selected branch through a Reading relation claim", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbReadingRelationClaim",
				full: true,
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingRelationClaim = { readonly endpointKind: "reading"; readonly relation: "CaseCounterpart" | "NumberCounterpart" | "PersonCounterpart"; readonly source: { lemma: { canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; family: "Lexeme"; kind: "VERB"; language: "de"; }; emojiDescription: string; }; readonly target: { lemma: { canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; family: "Lexeme"; kind: "VERB"; language: "de"; }; emojiDescription: string; }; }"`,
		);
	}, 30_000);
});
