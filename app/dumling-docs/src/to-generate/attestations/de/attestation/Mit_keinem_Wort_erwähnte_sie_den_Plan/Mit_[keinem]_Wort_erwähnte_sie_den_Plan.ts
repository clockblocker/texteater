import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "keinem",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "keinem",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			gender: "Neut",
			number: "Sing",
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
		lemma: {
			language: "de",
			canonicalForm: "kein",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Mit [keinem] Wort erwähnte sie den Plan.",
	classifierNotes:
		"Keinem is a negative determiner rather than a pronoun because it modifies Wort.",
	isVerified: true,
} as const;
