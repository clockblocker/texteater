import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "hinauszulaufen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "hinauszulaufen",
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
			canonicalForm: "hinauslaufen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "hinaus",
				hasGovPrep: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Er versucht, [hinauszulaufen].",
	classifierNotes:
		"The infinitive spelling `hinauszulaufen` directly exposes the separable verb lemma `hinauslaufen`, so this is an unambiguous verbal inflection rather than a standalone directional adverb.",
	isVerified: true,
} as const;
