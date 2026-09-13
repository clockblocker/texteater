import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "אין",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "he",
		normalizedSurface: "אין",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "אין",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hebExistential: "Yes",
				hebBinyan: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[אין] מקום פנוי.",
	classifierNotes:
		"אין is the negative existential verb; its negativity is lexical here, not an inflectional polarity feature.",
} as const;
