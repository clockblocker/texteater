import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
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
		language: "he",
		normalizedSurface: "תפסת מרובה לא תפסת",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "תפסת מרובה לא תפסת",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[תפסת] מרובה לא תפסת.",
	classifierNotes:
		"The Full Attestation records every member of the proverb occurrence; the docs review span on תפסת does not make it a standalone verb Attestation.",
} as const;
