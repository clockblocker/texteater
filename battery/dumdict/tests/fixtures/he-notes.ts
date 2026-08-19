import type { Lemma, Reading, SerializedDictionaryNote } from "../../src";

export const hebrewKatavLemma = {
	canonicalForm: "כתב",
	coreFeatures: {
		hebBinyan: "PAAL",
		hebExistential: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"he", "Lexeme", "VERB">;

export const hebrewKatavReading = {
	lemma: hebrewKatavLemma,
	emojiDescription: "✍️",
} satisfies Reading<"he">;

export const heSerializedNotes = [
	{
		schemaVersion: 1,
		lemmaRecord: { lemma: hebrewKatavLemma },
		readingEntries: [
			{
				reading: hebrewKatavReading,
				attestedTranslations: ["write"],
				attestations: ["הוא כתב מכתב."],
				notes: "Core writing reading.",
			},
		],
		ownedSurfaceEntries: [],
		pendingRelations: [],
	},
] satisfies SerializedDictionaryNote<"he">[];
