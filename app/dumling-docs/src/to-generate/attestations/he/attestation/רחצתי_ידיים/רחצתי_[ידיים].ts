import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ידיים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ידיים",
		spelling: "Canonical",

		inflectionalFeatures: {
			number: "Dual",
			definite: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "יד",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "רחצתי [ידיים].",
	classifierNotes: "ידיים is a dual-number surface for a paired body part.",
} as const;
