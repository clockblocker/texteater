import type { AttestedSelection, Selection } from "dumling/types";

const deSelection012 = {
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
			meaningInEmojis: "🔒",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection012,
	sentenceMarkdown: "Das [Schloss] an der Tür klemmt.",
	classifierNotes: "This is the lock sense of Schloss.",
	isVerified: true,
} as const satisfies AttestedSelection;
