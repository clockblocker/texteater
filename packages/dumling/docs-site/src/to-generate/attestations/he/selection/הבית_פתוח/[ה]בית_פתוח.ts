import type { AttestedSelection, Selection } from "dumling/types";

const haDeterminerSelection = {
	language: "he",
	spelledSelection: "ה",

	surface: {
		language: "he",
		normalizedFullSurface: "ה",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "ה",
			lemmaKind: "Lexeme",
			lemmaSubKind: "DET",
			inherentFeatures: {
				pronType: "Art",
			},
			meaningInEmojis: "🔎",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "DET">;

export const attestation = {
	selection: haDeterminerSelection,
	sentenceMarkdown: "[ה]בית פתוח.",
	classifierNotes:
		"The standalone article is modeled as DET with pronType Art, not as a noun definiteness feature.",
} as const satisfies AttestedSelection;
