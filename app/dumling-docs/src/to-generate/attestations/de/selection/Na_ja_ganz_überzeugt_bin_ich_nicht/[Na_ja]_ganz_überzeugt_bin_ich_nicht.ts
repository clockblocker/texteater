import type { AttestedSelection, Selection } from "dumling/types";

const deSelection047 = {
	language: "de",
	spelledSelection: "Na ja",

	surface: {
		language: "de",
		normalizedFullSurface: "na ja",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "na ja",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {
				discourseFormulaRole: "Reaction",
			},
			meaningInEmojis: "🤷",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: deSelection047,
	sentenceMarkdown: "[Na ja], ganz überzeugt bin ich nicht.",
	classifierNotes:
		"Na ja is treated as a discourse formula with the role Reaction; punctuation is excluded from the normalized surface.",
} as const satisfies AttestedSelection;
