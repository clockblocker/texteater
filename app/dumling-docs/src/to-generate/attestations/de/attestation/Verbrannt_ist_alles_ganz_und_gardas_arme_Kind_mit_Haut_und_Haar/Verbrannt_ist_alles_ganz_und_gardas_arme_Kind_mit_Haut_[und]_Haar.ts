import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "und",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "und",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "und",
			family: "Lexeme",
			kind: "CCONJ",
			coreFeatures: {
				conjType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "CCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Verbrannt ist alles ganz und gar,\ndas arme Kind mit Haut [und] Haar;",
	classifierNotes:
		"Und is classified word-by-word here because the phrase is being used literally, not as an idiom. In this line it is the ordinary coordinating conjunction linking the two literal nouns Haut and Haar.",
	classificationMistakes:
		"Do not keep a literally used idiom as a phraseme. The earlier mistake here was classifying und as a Partial attestation of the idiom mit Haut und Haar instead of as the standalone coordinating conjunction und.",
	isVerified: true,
} as const;
