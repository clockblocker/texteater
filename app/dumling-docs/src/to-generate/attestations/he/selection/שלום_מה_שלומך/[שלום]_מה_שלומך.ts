import type { AttestedSelection, Selection } from "dumling/types";

const shalomFormulaSelection = {
	language: "he",
	spelledSelection: "שלום",

	surface: {
		language: "he",
		normalizedFullSurface: "שלום",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "שלום",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {},
			meaningInEmojis: "👋",
		},
	},
} satisfies Selection<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: shalomFormulaSelection,
	sentenceMarkdown: "[שלום], מה שלומך?",
	classifierNotes:
		"שלום is treated as a discourse formula rather than as the noun peace because the sentence is a greeting.",
} as const satisfies AttestedSelection;
