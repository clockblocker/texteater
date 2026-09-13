import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "אין",
			orthography: "Standard",
		},
		{
			attested: "חדש",
			orthography: "Standard",
		},
		{
			attested: "תחת",
			orthography: "Standard",
		},
		{
			attested: "השמש",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "אין חדש תחת השמש",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "אין חדש תחת השמש",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Phraseme", "Proverb">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "אין [חדש] תחת השמש.",
	classifierNotes:
		"The Full Attestation records every member of the proverb occurrence; the docs review span on חדש does not make it an adjective Surface.",
} as const;
