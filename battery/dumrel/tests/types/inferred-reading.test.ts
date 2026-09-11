import { describe, expect, it } from "bun:test";
import { inferredType } from "prinfer/testing";

import type {
	ReadingGrammaticalRelationClaim,
	ReadingReference,
} from "../../src/types";

export type GermanVerbReadingReference = Extract<
	ReadingReference<"de">,
	{ lemma: { language: "de"; family: "Lexeme"; kind: "VERB" } }
>;

export type GermanVerbReadingRelationClaim =
	ReadingGrammaticalRelationClaim<GermanVerbReadingReference>;

describe("Dumrel Reading inference", () => {
	it("preserves the selected branch at the Reading reference boundary", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbReadingReference",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingReference = { lemma: { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }; emojiDescription: string; }"`,
		);
	}, 30_000);

	it("preserves the selected branch through a Reading relation claim", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbReadingRelationClaim",
				full: true,
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingRelationClaim = { readonly endpointKind: "reading"; readonly relation: "CaseCounterpart" | "PersonCounterpart" | "NumberCounterpart"; readonly source: { lemma: { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }; emojiDescription: string; }; readonly target: { lemma: { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }; emojiDescription: string; }; }"`,
		);
	}, 30_000);
});
