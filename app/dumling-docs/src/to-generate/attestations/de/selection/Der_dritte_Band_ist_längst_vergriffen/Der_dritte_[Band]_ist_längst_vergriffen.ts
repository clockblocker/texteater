import type { AttestedSelection, Selection } from "dumling/types";

const deSelection004 = {
	language: "de",
	spelledSelection: "Band",

	surface: {
		language: "de",
		normalizedFullSurface: "Band",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Band",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "📘",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection004,
	sentenceMarkdown: "Der dritte [Band] ist längst vergriffen.",
	classifierNotes:
		"This is the masculine lexical item meaning volume, which stresses homograph and gender disambiguation.",
	isVerified: true,
} as const satisfies AttestedSelection;
