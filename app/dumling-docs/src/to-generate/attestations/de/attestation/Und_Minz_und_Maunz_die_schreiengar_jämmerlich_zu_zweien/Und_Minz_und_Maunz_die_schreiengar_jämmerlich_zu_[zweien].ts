import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "zweien",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "zweien",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			gender: null,
			number: null,
		},
		lemma: {
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "NUM">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Und Minz und Maunz, die schreien\ngar jämmerlich zu [zweien]",
	classifierNotes:
		"I treated zweien as the dative inflected form of the cardinal numeral zwei inside the fixed phrase zu zweien, rather than as a pronoun-like item.",
	isVerified: true,
} as const;
