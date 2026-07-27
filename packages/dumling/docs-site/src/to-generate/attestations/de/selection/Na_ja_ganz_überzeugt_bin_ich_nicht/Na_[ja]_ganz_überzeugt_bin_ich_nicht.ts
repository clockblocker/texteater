import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "ja",

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
	selection: deSelection,
	sentenceMarkdown: "Na [ja], ganz überzeugt bin ich nicht.",
	classifierNotes:
		"I treated the selected ja as part of the larger discourse formula na ja, so this is a Partial selection of the phraseme rather than a standalone response particle.",
	isVerified: true,
} as const satisfies AttestedSelection;
