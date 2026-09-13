import type * as Dumling from "dumling/types";
import type { SerializedDictionaryNote } from "../../src";

export const hebrewKatavLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "כתב",
	coreFeatures: {
		hebBinyan: "PAAL",
		hebExistential: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"he", "Lexeme", "VERB">;

export const hebrewKatavReading = {
	unitKind: "Reading" as const,
	lemma: hebrewKatavLemma,
	emojiDescription: "✍️",
} satisfies Dumling.Reading<"he">;

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
