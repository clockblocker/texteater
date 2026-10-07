import type * as Dumling from "dumling/types";
import type { SerializedDictionaryNote } from "../../src/dto/serialized-note";

export const germanGehenLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "gehen",
	coreFeatures: {
		lexicallyReflexive: null,
		hasSepPrefix: null,
	},
	language: "de",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"de", "Lexeme", "VERB">;

export const germanGehenReading = {
	unitKind: "Reading" as const,
	lemma: germanGehenLemma,
	emojiDescription: "🚶",
} satisfies Dumling.Reading<"de">;

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
