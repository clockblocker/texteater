import type { AttestedSelection, Selection } from "dumling/types";

const chasVechalilaIdiomSelection = {
	language: "he",
	spelledSelection: "חס וחלילה",

	surface: {
		language: "he",
		normalizedFullSurface: "חס וחלילה",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "חס וחלילה",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "🚫",
		},
	},
} satisfies Selection<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: chasVechalilaIdiomSelection,
	sentenceMarkdown: "[חס וחלילה] שנאחר שוב.",
	classifierNotes:
		"חס וחלילה is treated as an idiom because the literal pieces are not the learner-facing meaning.",
} as const satisfies AttestedSelection;
