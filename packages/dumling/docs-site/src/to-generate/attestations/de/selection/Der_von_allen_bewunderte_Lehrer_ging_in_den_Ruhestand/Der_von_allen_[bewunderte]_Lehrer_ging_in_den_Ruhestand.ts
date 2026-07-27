import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "bewunderte",

	surface: {
		language: "de",
		normalizedFullSurface: "bewunderte",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "bewundert",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "👏",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown:
		"Der von allen [bewunderte] Lehrer ging in den Ruhestand.",
	classifierNotes:
		"Bewunderte is an attributive participial adjective modifying Lehrer with nominative masculine singular agreement. Despite its verbal origin, this noun-modifying participle follows the repo's German rule that attributive participles classify as ADJ rather than VERB.",
	isVerified: true,
} as const satisfies AttestedSelection;
