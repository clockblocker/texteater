import type { AttestedSelection, Selection } from "dumling/types";

const atPronounSelection = {
	language: "he",
	spelledSelection: "את",

	surface: {
		language: "he",
		normalizedFullSurface: "את",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
			person: "2",
		},
		lemma: {
			language: "he",
			canonicalLemma: "את",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				pronType: "Prs",
			},
			meaningInEmojis: "👉",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: atPronounSelection,
	sentenceMarkdown: "רק [את] יודעת.",
	classifierNotes:
		"את is the pronoun homograph here, modeled with feminine second-person features.",
} as const satisfies AttestedSelection;
