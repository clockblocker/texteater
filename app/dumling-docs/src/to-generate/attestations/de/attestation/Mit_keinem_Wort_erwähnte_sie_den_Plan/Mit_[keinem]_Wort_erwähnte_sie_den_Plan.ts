import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "keinem",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "keinem",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "keinem",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: "Dat",
				gender: "Neut",
				number: "Sing",
				pronType: "Neg",
				definite: null,
				extPos: null,
				foreign: null,
				numType: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Mit [keinem] Wort erwähnte sie den Plan.",
	classifierNotes:
		"Keinem is a negative determiner rather than a pronoun because it modifies Wort.",
	isVerified: true,
} as const;
