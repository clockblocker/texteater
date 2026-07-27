import type { AttestedSelection, Selection } from "dumling/types";

const deSelection008 = {
	language: "de",
	spelledSelection: "Kiefer",

	surface: {
		language: "de",
		normalizedFullSurface: "Kiefer",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Kiefer",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "🌲",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection008,
	sentenceMarkdown: "Die alte [Kiefer] steht am Hang.",
	classifierNotes: "Kiefer is the feminine pine-tree sense here.",
	isVerified: true,
} as const satisfies AttestedSelection;
