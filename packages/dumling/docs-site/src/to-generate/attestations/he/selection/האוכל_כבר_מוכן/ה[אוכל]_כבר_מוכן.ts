import type { AttestedSelection, Selection } from "dumling/types";

const ochelNounSelection = {
	language: "he",
	spelledSelection: "אוכל",

	surface: {
		language: "he",
		normalizedFullSurface: "אוכל",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "אוכל",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🍲",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: ochelNounSelection,
	sentenceMarkdown: "ה[אוכל] כבר מוכן.",
	classifierNotes:
		"אוכל is the noun food here, separated from the future-verb homograph by lemma and POS.",
} as const satisfies AttestedSelection;
