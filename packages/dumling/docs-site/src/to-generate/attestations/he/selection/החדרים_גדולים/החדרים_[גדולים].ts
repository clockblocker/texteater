import type { AttestedSelection, Selection } from "dumling/types";

const gdolimAdjectiveSelection = {
	language: "he",
	spelledSelection: "גדולים",

	surface: {
		language: "he",
		normalizedFullSurface: "גדולים",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
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
	selection: gdolimAdjectiveSelection,
	sentenceMarkdown: "החדרים [גדולים].",
	classifierNotes: "גדולים is a masculine plural adjective inflection.",
} as const satisfies AttestedSelection;
