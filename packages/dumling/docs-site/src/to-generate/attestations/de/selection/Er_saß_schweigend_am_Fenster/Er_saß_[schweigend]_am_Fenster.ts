import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "schweigend",

	surface: {
		language: "de",
		normalizedFullSurface: "schweigend",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Pres",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "schweigen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🤫",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Er saß [schweigend] am Fenster.",
	classifierNotes:
		"Schweigend is the present participial form of schweigen used non-attributively. Under the repo's German rule for present participles, that keeps it under VERB rather than shifting it to ADJ or ADV.",
	isVerified: true,
} as const satisfies AttestedSelection;
