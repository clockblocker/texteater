import type { AttestedSelection, Selection } from "dumling/types";

const deSelection007 = {
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
				gender: "Masc",
			},
			meaningInEmojis: "🦷",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection007,
	sentenceMarkdown: "Der [Kiefer] schmerzte nach der Operation.",
	classifierNotes: "Kiefer is the masculine jaw sense here.",
	isVerified: true,
} as const satisfies AttestedSelection;
