import type { AttestedSelection, Selection } from "dumling/types";

const deSelection005 = {
	language: "de",
	spelledSelection: "Leiter",

	surface: {
		language: "de",
		normalizedFullSurface: "Leiter",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Leiter",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "🪜",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection005,
	sentenceMarkdown: "Die [Leiter] wackelte auf dem nassen Boden.",
	classifierNotes: "Leiter is the ladder sense here, with feminine gender.",
	isVerified: true,
} as const satisfies AttestedSelection;
