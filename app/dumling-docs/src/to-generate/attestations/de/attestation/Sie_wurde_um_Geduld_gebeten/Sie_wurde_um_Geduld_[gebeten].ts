import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "gebeten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "gebeten",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
			gender: null,
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "bitten",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "um",
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
	sentenceMarkdown: "Sie wurde um Geduld [gebeten].",
	classifierNotes:
		"The sentence is passive, but the selected participle is stored without voice because the form itself is simply the participle of bitten.",
	isVerified: true,
} as const;
