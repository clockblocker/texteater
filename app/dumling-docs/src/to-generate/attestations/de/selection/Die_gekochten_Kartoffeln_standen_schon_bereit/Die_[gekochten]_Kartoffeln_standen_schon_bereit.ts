import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "gekochten",

	surface: {
		language: "de",
		normalizedFullSurface: "gekochten",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "gekocht",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "🍳",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die [gekochten] Kartoffeln standen schon bereit.",
	classifierNotes:
		"Gekochten is an attributive participial adjective modifying Kartoffeln. Because it is a noun-modifying agreement form, the current German rule stores it as ADJ rather than as a verbal participle.",
	isVerified: true,
} as const satisfies AttestedSelection;
