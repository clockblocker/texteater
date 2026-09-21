import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "lag",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "lag",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "liegen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das rote Band [lag] auf dem Geschenk.",
	classifierNotes:
		"Lag is the past finite form of liegen in a stative location reading, not a causative legen form.",
	isVerified: true,
} as const;
