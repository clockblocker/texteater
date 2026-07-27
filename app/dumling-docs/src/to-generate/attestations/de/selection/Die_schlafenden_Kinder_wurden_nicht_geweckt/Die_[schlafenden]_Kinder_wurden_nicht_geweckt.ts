import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "schlafenden",

	surface: {
		language: "de",
		normalizedFullSurface: "schlafenden",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "schlafend",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "😴",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die [schlafenden] Kinder wurden nicht geweckt.",
	classifierNotes:
		"Schlafenden is an attributive participial adjective modifying Kinder, so this plural nominative agreement form is stored as ADJ rather than as the verb schlafen.",
	isVerified: true,
} as const satisfies AttestedSelection;
