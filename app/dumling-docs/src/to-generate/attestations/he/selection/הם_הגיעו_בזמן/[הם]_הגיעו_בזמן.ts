import type { AttestedSelection, Selection } from "dumling/types";

const hemPronounSelection = {
	language: "he",
	spelledSelection: "הם",

	surface: {
		language: "he",
		normalizedFullSurface: "הם",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
			person: "3",
		},
		lemma: {
			language: "he",
			canonicalLemma: "הם",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				pronType: "Prs",
			},
			meaningInEmojis: "👥",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: hemPronounSelection,
	sentenceMarkdown: "[הם] הגיעו בזמן.",
	classifierNotes: "הם is a third-person masculine plural pronoun.",
} as const satisfies AttestedSelection;
