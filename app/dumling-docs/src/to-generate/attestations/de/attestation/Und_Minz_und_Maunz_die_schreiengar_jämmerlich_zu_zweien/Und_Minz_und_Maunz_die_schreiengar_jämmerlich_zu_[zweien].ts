import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "zweien",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "zweien",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Dat",
			gender: null,
			number: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "zwei",
			family: "Lexeme",
			kind: "NUM",
			coreFeatures: {
				numType: "Card",
				abbr: null,
				foreign: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "NUM">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Und Minz und Maunz, die schreien\ngar jämmerlich zu [zweien]",
	classifierNotes:
		"I treated zweien as the dative inflected form of the cardinal numeral zwei inside the fixed phrase zu zweien, rather than as a pronoun-like item.",
	isVerified: true,
} as const;
