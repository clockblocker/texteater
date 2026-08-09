import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "את",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "את",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "את",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				case: "Acc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "ראיתי [את] הסרט.",
	classifierNotes:
		"את is the accusative marker here, modeled as ADP and kept separate from the pronoun homograph.",
} as const;
