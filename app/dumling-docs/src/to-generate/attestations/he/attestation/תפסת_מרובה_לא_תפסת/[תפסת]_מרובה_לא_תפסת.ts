import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "תפסת",
			orthography: "Standard",
		},
		{
			attested: "מרובה",
			orthography: "Standard",
		},
		{
			attested: "לא",
			orthography: "Standard",
		},
		{
			attested: "תפסת",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "תפסת מרובה לא תפסת",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "תפסת מרובה לא תפסת",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Phraseme", "Proverb">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[תפסת] מרובה לא תפסת.",
	classifierNotes:
		"The Full Attestation records every member of the proverb occurrence; the docs review span on תפסת does not make it a standalone verb Attestation.",
} as const;
