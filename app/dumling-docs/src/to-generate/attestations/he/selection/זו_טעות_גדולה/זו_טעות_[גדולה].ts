import type { AttestedSelection, Selection } from "dumling/types";

const gdolaAdjectiveSelection = {
	language: "he",
	spelledSelection: "גדולה",

	surface: {
		language: "he",
		normalizedFullSurface: "גדולה",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "he",
			canonicalLemma: "גדול",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "📏",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: gdolaAdjectiveSelection,
	sentenceMarkdown: "זו טעות [גדולה].",
	classifierNotes: "גדולה is a feminine singular adjective inflection.",
} as const satisfies AttestedSelection;
