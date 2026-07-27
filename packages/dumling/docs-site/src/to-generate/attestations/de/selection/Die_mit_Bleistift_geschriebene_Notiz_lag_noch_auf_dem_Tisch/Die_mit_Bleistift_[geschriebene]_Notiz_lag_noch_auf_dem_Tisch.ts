import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "geschriebene",

	surface: {
		language: "de",
		normalizedFullSurface: "geschriebene",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "geschrieben",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "✍️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown:
		"Die mit Bleistift [geschriebene] Notiz lag noch auf dem Tisch.",
	classifierNotes:
		"Geschriebene is an attributive participial adjective modifying Notiz with nominative feminine singular agreement. The surrounding mit Bleistift phrase adds manner/instrument information but does not change the highlight from the adjectival participle classification used here.",
	isVerified: true,
} as const satisfies AttestedSelection;
