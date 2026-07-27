import type { AttestedSelection, Selection } from "dumling/types";

const halfDeterminerFractionSelection = {
	language: "en",
	spelledSelection: "half",

	surface: {
		language: "en",
		normalizedFullSurface: "half",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "half",
			lemmaKind: "Lexeme",
			lemmaSubKind: "DET",
			inherentFeatures: {
				numForm: "Word",
				numType: "Frac",
			},
			meaningInEmojis: "½",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "DET">;

export const attestation = {
	selection: halfDeterminerFractionSelection,
	sentenceMarkdown: "Use [half] the flour first.",
	classifierNotes:
		"Half before a noun phrase is DET with fractional number features, not NUM.",
} as const satisfies AttestedSelection;
