import { describe, expect, it } from "bun:test";
import type { Equal, Expect } from "common-utils";
import type { Reading } from "dumling/types";
import { inferredType } from "prinfer/testing";

import type {
	KnowledgeGenerationInput,
	ReadingCatalogMiss,
	ReadingKnowledgeCatalogMiss,
} from "../../src";

type GermanVerb = {
	lemma: { language: "de"; family: "Lexeme"; kind: "VERB" };
};

type GermanNounRoute = {
	route: { family: "Lexeme"; kind: "NOUN" };
};

export type GermanVerbReading = Extract<Reading<"de">, GermanVerb>;

export type GermanVerbKnowledgeInputReading = Extract<
	KnowledgeGenerationInput<"de">["reading"],
	GermanVerb
>;

export type GermanVerbReadingCatalogMiss = Extract<
	ReadingCatalogMiss,
	{ candidate: GermanVerbReading }
>;

export type GermanVerbKnowledgeCatalogMiss = Extract<
	ReadingKnowledgeCatalogMiss,
	{ reading: GermanVerbReading }
>;

export type ReadingCatalogMissRejectsMismatchedRoute = Expect<
	Equal<
		Extract<
			ReadingCatalogMiss,
			GermanNounRoute & { candidate: GermanVerbReading }
		>,
		never
	>
>;

export type KnowledgeCatalogMissRejectsMismatchedRoute = Expect<
	Equal<
		Extract<
			ReadingKnowledgeCatalogMiss,
			GermanNounRoute & { reading: GermanVerbReading }
		>,
		never
	>
>;

describe("Dumgen Reading inference", () => {
	it("preserves the selected branch at Knowledge Generation ingress", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbKnowledgeInputReading",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbKnowledgeInputReading = { lemma: { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }; emojiDescription: string; }"`,
		);
	}, 30_000);

	it("preserves and correlates the selected branch in Reading Catalog Misses", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbReadingCatalogMiss",
				full: true,
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingCatalogMiss = { readonly decision: "CatalogMiss"; readonly reason: CatalogMissReason; readonly language: "de"; readonly route: Readonly<{ family: "Lexeme"; kind: "VERB"; }>; readonly stage: "Reading"; readonly candidate: { lemma: { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }; emojiDescription: string; }; }"`,
		);
	}, 30_000);

	it("preserves and correlates the selected branch in Knowledge Catalog Misses", () => {
		expect(
			inferredType(import.meta.url, {
				name: "GermanVerbKnowledgeCatalogMiss",
				full: true,
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbKnowledgeCatalogMiss = { readonly decision: "CatalogMiss"; readonly reason: CatalogMissReason; readonly language: "de"; readonly route: Readonly<{ family: "Lexeme"; kind: "VERB"; }>; readonly stage: "ReadingKnowledge"; readonly reading: { lemma: { language: "de"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }; emojiDescription: string; }; readonly missingRequest: KnowledgeGenerationRequest; }"`,
		);
	}, 30_000);
});
