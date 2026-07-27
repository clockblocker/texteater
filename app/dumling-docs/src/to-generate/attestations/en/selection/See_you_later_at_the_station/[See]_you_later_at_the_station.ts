import type { AttestedSelection, Selection } from "dumling/types";

const seeYouLaterFormulaPartialSelection = {
	language: "en",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "See",

	surface: {
		language: "en",
		normalizedFullSurface: "see you later",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "see you later",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {
				discourseFormulaRole: "Farewell",
			},
			meaningInEmojis: "👋",
		},
	},
} satisfies Selection<"en", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: seeYouLaterFormulaPartialSelection,
	sentenceMarkdown: "[See] you later at the station.",
	classifierNotes:
		"Only See is selected, but the intended formula is see you later.",
} as const satisfies AttestedSelection;
