import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "lasse",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "lasse",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "1",
			tense: "Pres",
			verbForm: "Fin",
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
	sentenceMarkdown: "Ich [lasse] mir morgen die Haare schneiden.",
	classifierNotes:
		"Lasse is the 1st-person singular present indicative form of the lexical verb lassen heading the causative construction.",
	isVerified: true,
} as const;
