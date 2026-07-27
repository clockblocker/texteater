import type { AttestedSelection, Selection } from "dumling/types";

const bevakashaFormulaSelection = {
	language: "he",
	spelledSelection: "בבקשה",

	surface: {
		language: "he",
		normalizedFullSurface: "בבקשה",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "בבקשה",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {},
			meaningInEmojis: "🤲",
		},
	},
} satisfies Selection<"he", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: bevakashaFormulaSelection,
	sentenceMarkdown: "אפשר מים, [בבקשה]?",
	classifierNotes:
		"בבקשה is treated as a request politeness formula despite containing the noun בקשה.",
} as const satisfies AttestedSelection;
