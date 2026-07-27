import type { AttestedSelection, Selection } from "dumling/types";

const shelGenitiveSelection = {
	language: "he",
	spelledSelection: "של",

	surface: {
		language: "he",
		normalizedFullSurface: "של",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "של",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADP",
			inherentFeatures: {
				case: "Gen",
			},
			meaningInEmojis: "🔗",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: shelGenitiveSelection,
	sentenceMarkdown: "הספר [של] נועה נשאר כאן.",
	classifierNotes: "של is the genitive relation marker here, modeled as ADP.",
} as const satisfies AttestedSelection;
