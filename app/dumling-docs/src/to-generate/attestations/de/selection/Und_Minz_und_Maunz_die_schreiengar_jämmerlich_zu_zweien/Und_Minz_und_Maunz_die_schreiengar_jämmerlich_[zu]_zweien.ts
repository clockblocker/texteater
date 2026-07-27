import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "zu",

	surface: {
		language: "de",
		normalizedFullSurface: "zu",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "zu",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADP",
			inherentFeatures: {
				adpType: "Prep",
				governedCase: "Dat",
			},
			meaningInEmojis: "👥",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, die schreien
gar jämmerlich [zu] zweien`,
	classifierNotes:
		"Here zu is the preposition heading the fixed adverbial phrase zu zweien, so I kept it as ADP rather than reading it as infinitival or separable-particle zu.",
	isVerified: true,
} as const satisfies AttestedSelection;
