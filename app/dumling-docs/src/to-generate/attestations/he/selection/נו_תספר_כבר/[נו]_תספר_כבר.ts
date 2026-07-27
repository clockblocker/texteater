import type { AttestedSelection, Selection } from "dumling/types";

const nuInterjectionSelection = {
	language: "he",
	spelledSelection: "נו",

	surface: {
		language: "he",
		normalizedFullSurface: "נו",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "נו",
			lemmaKind: "Lexeme",
			lemmaSubKind: "INTJ",
			inherentFeatures: {},
			meaningInEmojis: "🙄",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	selection: nuInterjectionSelection,
	sentenceMarkdown: "[נו], תספר כבר.",
	classifierNotes:
		"נו is kept as INTJ rather than a discourse formula because it functions as a prompting interjection.",
} as const satisfies AttestedSelection;
