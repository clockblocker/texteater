import type { AttestedSelection, Selection } from "dumling/types";

const dataPluralSelection = {
	language: "en",
	spelledSelection: "data",

	surface: {
		language: "en",
		normalizedFullSurface: "data",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
		},
		lemma: {
			language: "en",
			canonicalLemma: "datum",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "📊",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: dataPluralSelection,
	sentenceMarkdown: "The [data] are still inconsistent.",
	classifierNotes:
		"Data is treated as a plural inflection of datum, even though contemporary usage often treats data as mass or singular.",
} as const satisfies AttestedSelection;
