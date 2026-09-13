import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "בית",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "בית",
		spelling: "Canonical",

		inflectionalFeatures: {
			definite: "Def",
			number: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "בית",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "חזרתי ל[בית].",
	classifierNotes:
		"The Full Attestation preserves the complete normalized Surface בית; the fused prefix outside the member still supplies the contextual definite Def feature.",
} as const;
