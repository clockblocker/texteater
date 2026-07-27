import type { AttestedSelection, Selection } from "dumling/types";

const aniPronounSelection = {
	language: "he",
	spelledSelection: "אני",

	surface: {
		language: "he",
		normalizedFullSurface: "אני",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
			person: "1",
		},
		lemma: {
			language: "he",
			canonicalLemma: "אני",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				pronType: "Prs",
			},
			meaningInEmojis: "🙋",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: aniPronounSelection,
	sentenceMarkdown: "[אני] לא בטוחה.",
	classifierNotes:
		"The first-person pronoun has person and number but no gender feature.",
} as const satisfies AttestedSelection;
