import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "n't",
			orthography: "Fused",
			fusion: {
				spelling: "don't",
				components: [
					{ span: "do", surface: "do" },
					{ span: "n't", surface: "not" },
				],
			},
			component: 1,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "not",
		spelling: "Canonical",
		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "not",
			family: "Lexeme",
			kind: "PART",
			coreFeatures: {
				abbr: null,
				extPos: null,
				polarity: "Neg",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "PART">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I do[n't] know yet.",
	classifierNotes:
		"n't is the negative PART not, the same Lemma as a written-out not. It is the Fused second piece of don't; do is the AUX piece.",
} as const;
