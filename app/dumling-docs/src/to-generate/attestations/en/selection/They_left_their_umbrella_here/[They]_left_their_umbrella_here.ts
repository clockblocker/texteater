import type { AttestedSelection, Selection } from "dumling/types";

const theyPronounPluralSelection = {
	language: "en",
	spelledSelection: "They",

	surface: {
		language: "en",
		normalizedFullSurface: "they",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			language: "en",
			canonicalLemma: "they",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				person: "3",
				pronType: "Prs",
			},
			meaningInEmojis: "👥",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: theyPronounPluralSelection,
	sentenceMarkdown: "[They] left their umbrella here.",
	classifierNotes:
		"They is marked plural because the current English PRON schema has number but no singular-they semantic flag.",
} as const satisfies AttestedSelection;
