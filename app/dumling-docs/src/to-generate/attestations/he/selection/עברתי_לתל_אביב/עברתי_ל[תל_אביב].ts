import type { AttestedSelection, Selection } from "dumling/types";

const telAvivSelection = {
	language: "he",
	spelledSelection: "תל אביב",

	surface: {
		language: "he",
		normalizedFullSurface: "תל אביב",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "תל אביב",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PROPN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "🌆",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	selection: telAvivSelection,
	sentenceMarkdown: "עברתי ל[תל אביב].",
	classifierNotes:
		"תל אביב is a multiword proper-noun citation with no additional inflectional surface features.",
} as const satisfies AttestedSelection;
