import type { Lemma, Reading, SerializedDictionaryNoteV0 } from "../../src";

export const germanGehenLemma = {
	canonicalForm: "gehen",
	coreFeatures: {
		verbType: null,
		lexicallyReflexive: null,
		hasSepPrefix: null,
		hasGovPrep: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"de", "Lexeme", "VERB">;

export const germanGehenReading = {
	lemma: germanGehenLemma,
	emojiDescription: "🚶",
} satisfies Reading<"de">;

export const deSerializedNotes = [
	{
		lemmaRecord: {
			lemma: germanGehenLemma,
			morphologicalRelations: {},
		},
		readingEntries: [
			{
				reading: germanGehenReading,
				lexicalRelations: {},
				attestedTranslations: ["go", "walk"],
				attestations: ["Wir gehen nach Hause."],
				notes: "Core motion reading.",
			},
		],
		ownedSurfaceEntries: [],
		pendingRelations: [],
	},
] satisfies SerializedDictionaryNoteV0<"de">[];
