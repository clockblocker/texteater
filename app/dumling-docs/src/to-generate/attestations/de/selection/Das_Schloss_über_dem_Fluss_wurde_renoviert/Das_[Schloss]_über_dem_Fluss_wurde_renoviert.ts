import type { AttestedSelection, Selection } from "dumling/types";

const deSelection011 = {
	language: "de",
	spelledSelection: "Schloss",

	surface: {
		language: "de",
		normalizedFullSurface: "Schloss",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Schloss",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "🏰",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection011,
	sentenceMarkdown: "Das [Schloss] über dem Fluss wurde renoviert.",
	classifierNotes: "This is the castle sense of Schloss.",
	isVerified: true,
} as const satisfies AttestedSelection;
