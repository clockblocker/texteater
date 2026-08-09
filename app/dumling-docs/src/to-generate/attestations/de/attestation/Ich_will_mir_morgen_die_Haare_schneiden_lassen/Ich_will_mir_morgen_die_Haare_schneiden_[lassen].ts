import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "lassen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "lassen",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			verbForm: "Inf",
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "lassen",
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Ich will mir morgen die Haare schneiden [lassen].",
	classifierNotes:
		"The attested member is the plain infinitive of the lexical verb lassen in a causative construction, not a citation form standing outside syntax.",
	isVerified: true,
} as const;
