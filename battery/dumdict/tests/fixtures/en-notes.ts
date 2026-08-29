import { readingFingerprint } from "dumling";
import type {
	Lemma,
	Reading,
	SerializedDictionaryNote,
	Surface,
} from "../../src";
import { derivePendingEntryId } from "../../src/core/pending";

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
