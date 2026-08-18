import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "sind",
			orthography: "Standard",
		},
		{
			attested: "gekocht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "sind gekocht",
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
			canonicalForm: "kochen",
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
	sentenceMarkdown: "Die Kartoffeln sind bereits [gekocht].",
	classifierNotes:
		"Sind plus gekocht preserves the productive kochen event and forms one state-passive VERB target. The participle owns morphology and the Lemma; the auxiliary is a fixed member.",
	isVerified: true,
} as const;
