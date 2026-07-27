import type { AttestedSelection, Selection } from "dumling/types";

const ganzeAdjectiveSelection = {
	language: "de",
	spelledSelection: "ganze",

	surface: {
		language: "de",
		normalizedFullSurface: "ganze",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Neut",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "ganz",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "🧩",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: ganzeAdjectiveSelection,
	sentenceMarkdown: `Es brennt die Hand, es brennt das Haar,
es brennt das [ganze] Kind sogar.`,
	classifierNotes:
		"Ganze is an attributive adjective modifying Kind. The surface form is syncretic between neuter nominative and accusative singular after das; I chose nominative because in this rhyme das ganze Kind reads as the postposed subject of brennt.",
	isVerified: true,
} as const satisfies AttestedSelection;
