import type * as Dumling from "dumling/types";
import type { SurfaceEntry } from "../../src/domain-types";
import type { SerializedDictionaryNote } from "../../src/dto/serialized-note";
import { makeSurfaceId } from "../../src/dumling-id";

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

const germanGehenCitationSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "de",
	lemma: germanGehenLemma,
	normalizedSurface: "gehen",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
} satisfies Dumling.Surface<"de", "Lexeme", "VERB">;

const gehenSurface = {
	id: makeSurfaceId("de", germanGehenCitationSurface),
	surface: germanGehenCitationSurface,
	ownerLemma: germanGehenLemma,
	attestedTranslations: [],
	attestations: [],
	notes: "",
} satisfies SurfaceEntry<"de">;

export const deSerializedNotes = [
	{
		schemaVersion: 2,
		lemmaRecord: { lemma: germanGehenLemma },
		readingEntries: [
			{
				reading: germanGehenReading,
				attestedTranslations: ["go", "walk"],
				attestationLinks: [
					{
						ref: "Wir gehen nach Hause.",
						surfaceId: gehenSurface.id,
						reading: germanGehenReading,
					},
				],
				notes: "Core motion reading.",
			},
		],
		ownedSurfaceEntries: [gehenSurface],
		pendingRelations: [],
	},
] satisfies SerializedDictionaryNote<"de">[];
