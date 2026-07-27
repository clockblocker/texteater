import type { AttestedSelection, Selection } from "dumling/types";

const biglalAdpositionSelection = {
	language: "he",
	spelledSelection: "בגלל",

	surface: {
		language: "he",
		normalizedFullSurface: "בגלל",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "בגלל",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADP",
			inherentFeatures: {},
			meaningInEmojis: "☔",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: biglalAdpositionSelection,
	sentenceMarkdown: "נשארנו בבית [בגלל] הגשם.",
	classifierNotes:
		"בגלל is a causal adposition without an additional case feature in the current schema.",
} as const satisfies AttestedSelection;
