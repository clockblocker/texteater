import type { AttestedSelection, Selection } from "dumling/types";

const hitkatevVerbSelection = {
	language: "he",
	spelledSelection: "התכתב",

	surface: {
		language: "he",
		normalizedFullSurface: "התכתב",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "3",
			tense: "Past",
			voice: "Mid",
		},
		lemma: {
			language: "he",
			canonicalLemma: "כתב",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebBinyan: "HITPAEL",
			},
			meaningInEmojis: "💬",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: hitkatevVerbSelection,
	sentenceMarkdown: "הוא [התכתב] עם המרצה.",
	classifierNotes:
		"התכתב is analyzed as HITPAEL with voice Mid to expose reflexive or reciprocal middle behavior.",
} as const satisfies AttestedSelection;
