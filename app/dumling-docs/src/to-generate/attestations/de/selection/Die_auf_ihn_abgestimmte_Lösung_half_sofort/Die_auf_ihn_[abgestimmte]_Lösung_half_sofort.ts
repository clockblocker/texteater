import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "abgestimmte",

	surface: {
		language: "de",
		normalizedFullSurface: "abgestimmte",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "abgestimmt",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "🎯",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die auf ihn [abgestimmte] Lösung half sofort.",
	classifierNotes:
		"Abgestimmte is an attributive participial adjective modifying Loesung with nominative feminine singular agreement. The dependent phrase auf ihn stays part of the surrounding attestation context, but the highlighted noun-modifying participle still follows the repo's German rule that attributive participles classify as ADJ rather than VERB.",
	isVerified: true,
} as const satisfies AttestedSelection;
