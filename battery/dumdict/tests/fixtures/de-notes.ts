import type { Lemma, Reading, SerializedDictionaryNote } from "../../src";

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
		schemaVersion: 1,
		lemmaRecord: { lemma: germanGehenLemma },
		readingEntries: [
			{
				reading: germanGehenReading,
				attestedTranslations: ["go", "walk"],
				attestations: ["Wir gehen nach Hause."],
				notes: "Core motion reading.",
			},
		],
		ownedSurfaceEntries: [],
		pendingRelations: [],
	},
] satisfies SerializedDictionaryNote<"de">[];
