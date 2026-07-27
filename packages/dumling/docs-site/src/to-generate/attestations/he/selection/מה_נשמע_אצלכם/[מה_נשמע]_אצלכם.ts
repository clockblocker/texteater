import type { AttestedSelection, Selection } from "dumling/types";

const maNishmaFormulaSelection = {
	language: "he",
	spelledSelection: "מה נשמע",

	surface: {
		language: "he",
		normalizedFullSurface: "מה נשמע",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "מה נשמע",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {},
			meaningInEmojis: "💬",
		},
	},
} satisfies Selection<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: maNishmaFormulaSelection,
	sentenceMarkdown: "[מה נשמע] אצלכם?",
	classifierNotes:
		"The multiword greeting is modeled as one discourse-formula surface.",
} as const satisfies AttestedSelection;
