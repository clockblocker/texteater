import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "hinauszulaufen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "hinauszulaufen",
		spelling: "Canonical",

		inflectionalFeatures: {
			verbForm: "Inf",
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Er versucht, [hinauszulaufen].",
	classifierNotes:
		"The infinitive spelling `hinauszulaufen` directly exposes the separable verb lemma `hinauslaufen`, so this is an unambiguous verbal inflection rather than a standalone directional adverb.",
	isVerified: true,
} as const;
