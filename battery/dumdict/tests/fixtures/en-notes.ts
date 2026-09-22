import type * as Dumling from "dumling/types";
import type { SerializedDictionaryNote } from "../../src";
import { readingFingerprint } from "../../src/core/identity";
import { derivePendingEntryId } from "../../src/core/pending";

const englishVerbFeatures = {
	style: null,
	phrasal: null,
	extPos: null,
	abbr: null,
} as const;

export const englishWalkLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "walk",
	coreFeatures: englishVerbFeatures,
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"en", "Lexeme", "VERB">;

export const englishRunLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "run",
	coreFeatures: englishVerbFeatures,
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"en", "Lexeme", "VERB">;

export const englishSwimLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "swim",
	coreFeatures: englishVerbFeatures,
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"en", "Lexeme", "VERB">;

export const englishWalkReading = {
	unitKind: "Reading" as const,
	lemma: englishWalkLemma,
	emojiDescription: "🚶",
} satisfies Dumling.Reading<"en">;
export const englishRunReading = {
	unitKind: "Reading" as const,
	lemma: englishRunLemma,
	emojiDescription: "🏃",
} satisfies Dumling.Reading<"en">;
export const englishSwimReading = {
	unitKind: "Reading" as const,
	lemma: englishSwimLemma,
	emojiDescription: "🏊",
} satisfies Dumling.Reading<"en">;

export const englishSwimCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "en",
	lemma: englishSwimLemma,
	normalizedSurface: "swim",
	spelling: "Canonical",

	surfaceFeatures: null,
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

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
	attestedTranslations: ["walk"],
	attestations: ["They walk home together."],
	notes: "Core motion reading.",
};

export const enSerializedNotes = [
	{
		schemaVersion: 1,
		lemmaRecord: { lemma: englishWalkLemma },
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
		schemaVersion: 1,
		lemmaRecord: { lemma: englishWalkLemma },
		readingEntries: [walkReading],
		ownedSurfaceEntries: [],
		pendingRelations: [
			{
				sourceReading: englishWalkReading,
				pending: {
					relation: "nearSynonym",
					target: {
						language: "en",
						canonicalForm: "swim",
						family: "Lexeme",
						kind: "VERB",
					},
				},
				locator: {
					sourceReadingKey: readingFingerprint(englishWalkReading),
					relation: "nearSynonym",
					targetPendingId: pendingSwimEntryId,
				},
			},
		],
	},
] satisfies SerializedDictionaryNote<"en">[];
