import type { AttestedSelection, Selection } from "dumling/types";

const noWorriesFormulaSelection = {
	language: "en",
	spelledSelection: "No worries",

	surface: {
		language: "en",
		normalizedFullSurface: "no worries",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "no worries",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {
				discourseFormulaRole: "Acknowledgment",
			},
			meaningInEmojis: "🙂",
		},
	},
} satisfies Selection<"en", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: noWorriesFormulaSelection,
	sentenceMarkdown: "[No worries], I already fixed it.",
	classifierNotes:
		"No worries is a discourse formula rather than compositional negation plus noun.",
} as const satisfies AttestedSelection;
