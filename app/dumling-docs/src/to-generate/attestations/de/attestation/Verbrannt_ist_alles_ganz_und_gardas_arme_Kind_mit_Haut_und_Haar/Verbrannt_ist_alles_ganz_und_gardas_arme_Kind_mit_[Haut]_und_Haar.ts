import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Haut",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Haut",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Haut",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Verbrannt ist alles ganz und gar,\ndas arme Kind mit [Haut] und Haar;",
	classifierNotes:
		"Haut is classified word-by-word here because this occurrence is used literally, not idiomatically. The noun is dative singular after mit, even though the attested form is identical to the citation form.",
	classificationMistakes:
		"Do not keep a literally used idiom as a phraseme. The earlier mistake here was classifying Haut as a Partial attestation of the idiom mit Haut und Haar instead of as the standalone noun Haut in dative singular.",
	isVerified: true,
} as const;
