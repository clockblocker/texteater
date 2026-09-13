import { afterAll, describe, expect, it } from "bun:test";
import type { Equal, Expect } from "common-utils";
import type { Reading } from "dumling-old/types";
import { closeTestingSessions, inferredType } from "prinfer/testing";

import type {
	KnowledgeGenerationInput,
	ReadingCatalogMiss,
	ReadingKnowledgeCatalogMiss,
} from "../../src";

afterAll(closeTestingSessions);

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
	it("preserves the selected branch at Knowledge Generation ingress", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbKnowledgeInputReading",
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbKnowledgeInputReading = { lemma: { canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; family: "Lexeme"; kind: "VERB"; language: "de"; }; emojiDescription: string; }"`,
		);
	}, 30_000);

	it("preserves and correlates the selected branch in Reading Catalog Misses", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbReadingCatalogMiss",
				full: true,
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbReadingCatalogMiss = { readonly decision: "CatalogMiss"; readonly reason: CatalogMissReason; readonly language: "de"; readonly route: Readonly<{ family: "Lexeme"; kind: "VERB"; }>; readonly stage: "Reading"; readonly candidate: { lemma: { canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; family: "Lexeme"; kind: "VERB"; language: "de"; }; emojiDescription: string; }; }"`,
		);
	}, 30_000);

	it("preserves and correlates the selected branch in Knowledge Catalog Misses", async () => {
		expect(
			await inferredType(import.meta.url, {
				name: "GermanVerbKnowledgeCatalogMiss",
				full: true,
				backend: "typescript7",
			}),
		).toMatchInlineSnapshot(
			`"type GermanVerbKnowledgeCatalogMiss = { readonly decision: "CatalogMiss"; readonly reason: CatalogMissReason; readonly language: "de"; readonly route: Readonly<{ family: "Lexeme"; kind: "VERB"; }>; readonly stage: "ReadingKnowledge"; readonly reading: { lemma: { canonicalForm: string; coreFeatures: { hasGovPrep: string | null; hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; family: "Lexeme"; kind: "VERB"; language: "de"; }; emojiDescription: string; }; readonly missingRequest: KnowledgeGenerationRequest; }"`,
		);
	}, 30_000);
});
