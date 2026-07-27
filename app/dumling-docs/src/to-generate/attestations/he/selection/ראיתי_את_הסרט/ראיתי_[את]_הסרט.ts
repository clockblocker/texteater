import type { AttestedSelection, Selection } from "dumling/types";

const etAccusativeSelection = {
	language: "he",
	spelledSelection: "את",

	surface: {
		language: "he",
		normalizedFullSurface: "את",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "את",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADP",
			inherentFeatures: {
				case: "Acc",
			},
			meaningInEmojis: "🎯",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: etAccusativeSelection,
	sentenceMarkdown: "ראיתי [את] הסרט.",
	classifierNotes:
		"את is the accusative marker here, modeled as ADP and kept separate from the pronoun homograph.",
} as const satisfies AttestedSelection;
