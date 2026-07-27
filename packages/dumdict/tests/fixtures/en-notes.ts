import type { Lemma, Surface } from "../../src";
import { makeDumlingIdFor } from "../../src";
import { derivePendingLemmaId } from "../../src/core/pending/identity";
import type { SerializedDictionaryNote } from "../../src/testing/serialized-note";

export const englishWalkLemma = {
	canonicalLemma: "walk",
	inherentFeatures: {},
	language: "en",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	meaningInEmojis: "walk-as-motion",
} satisfies Lemma<"en", "Lexeme", "VERB">;

export const englishWalkLemmaId = makeDumlingIdFor("en", englishWalkLemma);

export const englishRunLemma = {
	canonicalLemma: "run",
	inherentFeatures: {},
	language: "en",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	meaningInEmojis: "run-as-motion",
} satisfies Lemma<"en", "Lexeme", "VERB">;

export const englishRunLemmaId = makeDumlingIdFor("en", englishRunLemma);

export const englishSwimLemma = {
	canonicalLemma: "swim",
	inherentFeatures: {},
	language: "en",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	meaningInEmojis: "swim-as-motion",
} satisfies Lemma<"en", "Lexeme", "VERB">;

export const englishSwimLemmaSurface = {
	language: "en",
	lemma: englishSwimLemma,
	normalizedFullSurface: "swim",
	surfaceKind: "Lemma",
} satisfies Surface<"en", "Lemma", "Lexeme", "VERB">;

export const enSerializedNotes = [
	{
		lemmaEntry: {
			id: englishWalkLemmaId,
			lemma: englishWalkLemma,
			lexicalRelations: {},
			morphologicalRelations: {},
			attestedTranslations: ["walk"],
			attestations: ["They walk home together."],
			notes: "Move at a regular pace by lifting and setting down each foot.",
		},
		ownedSurfaceEntries: [],
		pendingRelations: [],
	},
] satisfies SerializedDictionaryNote<"en">[];

export const pendingSwimLemmaId = derivePendingLemmaId({
	language: "en",
	canonicalLemma: "swim",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
});

export const enSerializedNotesWithPendingSwimRelation = [
	{
		lemmaEntry: {
			id: englishWalkLemmaId,
			lemma: englishWalkLemma,
			lexicalRelations: {},
			morphologicalRelations: {},
			attestedTranslations: ["walk"],
			attestations: ["They walk home together."],
			notes: "Move at a regular pace by lifting and setting down each foot.",
		},
		ownedSurfaceEntries: [],
		pendingRefs: [
			{
				pendingId: pendingSwimLemmaId,
				language: "en",
				canonicalLemma: "swim",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
			},
		],
		pendingRelations: [
			{
				sourceLemmaId: englishWalkLemmaId,
				relationFamily: "lexical",
				relation: "nearSynonym",
				targetPendingId: pendingSwimLemmaId,
			},
		],
	},
] satisfies SerializedDictionaryNote<"en">[];
