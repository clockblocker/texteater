import type { AttestedSelection, Selection } from "dumling/types";

const deSelection003 = {
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
				gender: "Fem",
			},
			meaningInEmojis: "🎸",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection003,
	sentenceMarkdown: "Die [Band] spielt heute im Kellerclub.",
	classifierNotes:
		"This is the feminine lexical item meaning a music group, despite sharing its spelling with the other Band entries.",
	isVerified: true,
} as const satisfies AttestedSelection;
