import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "אין",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "אין",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"he", "Citation", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[אין] מקום פנוי.",
	classifierNotes:
		"אין is the negative existential verb; its negativity is lexical here, not an inflectional polarity feature.",
} as const;
