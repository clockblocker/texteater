import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "lassen",

	surface: {
		language: "de",
		normalizedFullSurface: "lassen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			verbForm: "Inf",
		},
		lemma: {
			language: "de",
			canonicalLemma: "lassen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "➡️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Ich will mir morgen die Haare schneiden [lassen].",
	classifierNotes:
		"The selected token is the plain infinitive of the lexical verb lassen in a causative construction, not a citation form standing outside syntax.",
	isVerified: true,
} as const satisfies AttestedSelection;
