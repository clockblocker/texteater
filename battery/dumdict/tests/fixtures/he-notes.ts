import type { Lemma, Reading, SerializedDictionaryNoteV0 } from "../../src";

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
		lemmaRecord: {
			lemma: hebrewKatavLemma,
			morphologicalRelations: {},
		},
		readingEntries: [
			{
				reading: hebrewKatavReading,
				lexicalRelations: {},
				attestedTranslations: ["write"],
				attestations: ["הוא כתב מכתב."],
				notes: "Core writing reading.",
			},
		],
		ownedSurfaceEntries: [],
		pendingRelations: [],
	},
] satisfies SerializedDictionaryNoteV0<"he">[];
