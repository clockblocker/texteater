import type { AttestedSelection, Selection } from "dumling/types";

const deSelection041 = {
	language: "de",
	spelledSelection: "nicht",

	surface: {
		language: "de",
		normalizedFullSurface: "nicht",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "nicht",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PART",
			inherentFeatures: {
				polarity: "Neg",
			},
			meaningInEmojis: "⛔",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "PART">;

export const attestation = {
	selection: deSelection041,
	sentenceMarkdown: "Das ist [nicht] mein Problem.",
	classifierNotes:
		"Nicht is modeled as PART with polarity Neg rather than as an adverb.",
	isVerified: true,
} as const satisfies AttestedSelection;
