import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Schwimmen",

	surface: {
		language: "de",
		normalizedFullSurface: "Schwimmen",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Schwimmen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "🏊",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "[Schwimmen] ist gesund.",
	classifierNotes:
		"Schwimmen is classified as a substantivized infinitive here, so the selected learner-facing unit is a neuter noun rather than the verb schwimmen. The attested form is already citation-shaped for that nominal reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
