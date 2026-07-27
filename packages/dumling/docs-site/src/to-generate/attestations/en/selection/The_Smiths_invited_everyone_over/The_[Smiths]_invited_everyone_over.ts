import type { AttestedSelection, Selection } from "dumling/types";

const smithsPluralProperNounSelection = {
	language: "en",
	spelledSelection: "Smiths",

	surface: {
		language: "en",
		normalizedFullSurface: "Smiths",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
		},
		lemma: {
			language: "en",
			canonicalLemma: "Smith",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PROPN",
			inherentFeatures: {},
			meaningInEmojis: "👨‍👩‍👧‍👦",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "PROPN">;

export const attestation = {
	selection: smithsPluralProperNounSelection,
	sentenceMarkdown: "The [Smiths] invited everyone over.",
	classifierNotes:
		"Family-name plural is PROPN with inflectional number rather than a common noun.",
} as const satisfies AttestedSelection;
