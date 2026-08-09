import type { Lemma, Reading, Surface } from "../../src";
import { derivePendingEntryId } from "../../src/core/pending/identity";
import type { SerializedDictionaryNote } from "../../src/testing/serialized-note";

const englishVerbFeatures = {
	style: null,
	phrasal: null,
	hasGovPrep: null,
	extPos: null,
	abbr: null,
} as const;

export const englishWalkLemma = {
	canonicalForm: "walk",
	coreFeatures: englishVerbFeatures,
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"en", "Lexeme", "VERB">;

export const englishRunLemma = {
	canonicalForm: "run",
	coreFeatures: englishVerbFeatures,
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"en", "Lexeme", "VERB">;

export const englishSwimLemma = {
	canonicalForm: "swim",
	coreFeatures: englishVerbFeatures,
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"en", "Lexeme", "VERB">;

export const englishWalkReading = {
	lemma: englishWalkLemma,
	emojiDescription: "🚶",
} satisfies Reading<"en">;
export const englishRunReading = {
	lemma: englishRunLemma,
	emojiDescription: "🏃",
} satisfies Reading<"en">;
export const englishSwimReading = {
	lemma: englishSwimLemma,
	emojiDescription: "🏊",
} satisfies Reading<"en">;

export const englishSwimCitationSurface = {
	language: "en",
	lemma: englishSwimLemma,
	normalizedSurface: "swim",
	spelling: "Canonical",
	surfaceKind: "Citation",
	surfaceFeatures: null,
} satisfies Surface<"en", "Citation", "Lexeme", "VERB">;

export const englishSwimDraft = {
	reading: englishSwimReading,
	note: {
		attestedTranslations: ["swim"],
		attestations: ["They swim every morning."],
		notes: "Core swimming reading.",
	},
};

export const englishRunDraft = {
	reading: englishRunReading,
	note: {
		attestedTranslations: ["run"],
		attestations: ["They run every morning."],
		notes: "Core running reading.",
	},
};

const walkReading = {
	reading: englishWalkReading,
	lexicalRelations: {},
	attestedTranslations: ["walk"],
	attestations: ["They walk home together."],
	notes: "Core motion reading.",
};

export const enSerializedNotes = [
	{
		lemmaRecord: {
			lemma: englishWalkLemma,
			morphologicalRelations: {},
		},
		readingEntries: [walkReading],
		ownedSurfaceEntries: [],
		pendingRelations: [],
	},
] satisfies SerializedDictionaryNote<"en">[];

export const pendingSwimEntryId = derivePendingEntryId({
	language: "en",
	canonicalForm: "swim",
	family: "Lexeme",
	kind: "VERB",
});

export const enSerializedNotesWithPendingSwimRelation = [
	{
		lemmaRecord: {
			lemma: englishWalkLemma,
			morphologicalRelations: {},
		},
		readingEntries: [walkReading],
		ownedSurfaceEntries: [],
		pendingRefs: [
			{
				pendingId: pendingSwimEntryId,
				language: "en",
				canonicalForm: "swim",
				family: "Lexeme",
				kind: "VERB",
			},
		],
		pendingRelations: [
			{
				sourceReading: englishWalkReading,
				relationFamily: "lexical",
				relation: "nearSynonym",
				targetPendingId: pendingSwimEntryId,
			},
		],
	},
] satisfies SerializedDictionaryNote<"en">[];
