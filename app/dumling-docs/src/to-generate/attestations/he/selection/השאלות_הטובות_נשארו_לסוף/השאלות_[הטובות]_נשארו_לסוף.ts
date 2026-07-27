import type { AttestedSelection, Selection } from "dumling/types";

const hatovotAdjectiveSelection = {
	language: "he",
	spelledSelection: "הטובות",

	surface: {
		language: "he",
		normalizedFullSurface: "הטובות",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Def",
			gender: "Fem",
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalLemma: "טוב",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "👍",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: hatovotAdjectiveSelection,
	sentenceMarkdown: "השאלות [הטובות] נשארו לסוף.",
	classifierNotes:
		"הטובות is a definite feminine plural adjective surface that preserves article agreement.",
} as const satisfies AttestedSelection;
