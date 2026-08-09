import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Haar",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Haar",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Haar",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Verbrannt ist alles ganz und gar,\ndas arme Kind mit Haut und [Haar];",
	classifierNotes:
		"Haar is classified word-by-word here because the line uses the body-part phrase literally. The noun is dative singular after mit, although the surface form is syncretic with the citation form.",
	classificationMistakes:
		"Do not keep a literally used idiom as a phraseme. The earlier mistake here was classifying Haar as a Partial attestation of the idiom mit Haut und Haar instead of as the standalone noun Haar in dative singular.",
	isVerified: true,
} as const;
