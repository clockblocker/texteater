import type { AttestedSelection, Selection } from "dumling/types";

const whosePronounPossessiveSelection = {
	language: "en",
	spelledSelection: "Whose",

	surface: {
		language: "en",
		normalizedFullSurface: "whose",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
		},
		lemma: {
			language: "en",
			canonicalLemma: "who",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				poss: "Yes",
				pronType: "Int",
			},
			meaningInEmojis: "❔",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: whosePronounPossessiveSelection,
	sentenceMarkdown: "[Whose] keys are these?",
	classifierNotes:
		"Whose is attached to who with possessive and interrogative inherent features plus genitive surface case.",
} as const satisfies AttestedSelection;
