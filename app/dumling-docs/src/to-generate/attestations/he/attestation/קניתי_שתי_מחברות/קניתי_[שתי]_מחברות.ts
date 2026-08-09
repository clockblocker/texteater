import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "שתי",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "שתי",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			definite: "Cons",
			gender: "Fem",
			number: "Dual",
		},
		lemma: {
			language: "he",
			canonicalForm: "שתיים",
			family: "Lexeme",
			kind: "NUM",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "NUM">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "קניתי [שתי] מחברות.",
	classifierNotes:
		"שתי is the construct or feminine form of שתיים and is intentionally awkward for feature-boundary testing.",
} as const;
