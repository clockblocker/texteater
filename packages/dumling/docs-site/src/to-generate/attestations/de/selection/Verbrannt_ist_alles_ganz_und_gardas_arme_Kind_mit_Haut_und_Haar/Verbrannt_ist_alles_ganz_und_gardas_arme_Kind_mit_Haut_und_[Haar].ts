import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Haar",

	surface: {
		language: "de",
		normalizedFullSurface: "Haar",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Haar",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "💇",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Verbrannt ist alles ganz und gar,
das arme Kind mit Haut und [Haar];`,
	classifierNotes:
		"Haar is classified word-by-word here because the line uses the body-part phrase literally. The noun is dative singular after mit, although the surface form is syncretic with the citation form.",
	classificationMistakes:
		"Do not keep a literally used idiom as a phraseme. The earlier mistake here was classifying Haar as a Partial selection of the idiom mit Haut und Haar instead of as the standalone noun Haar in dative singular.",
	isVerified: true,
} as const satisfies AttestedSelection;
