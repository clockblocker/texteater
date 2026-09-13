import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "שתי",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "שתי",
		spelling: "Canonical",

		inflectionalFeatures: {
			definite: "Cons",
			gender: "Fem",
			number: "Dual",
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "שתיים",
			family: "Lexeme",
			kind: "NUM",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "NUM">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "קניתי [שתי] מחברות.",
	classifierNotes:
		"שתי is the construct or feminine form of שתיים and is intentionally awkward for feature-boundary testing.",
} as const;
