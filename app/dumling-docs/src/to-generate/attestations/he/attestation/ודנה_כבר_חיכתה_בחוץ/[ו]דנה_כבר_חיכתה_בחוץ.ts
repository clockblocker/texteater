import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ו",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "ו",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ו",
			family: "Morpheme",
			kind: "Clitic",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Morpheme", "Clitic">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[ו]דנה כבר חיכתה בחוץ.",
	classifierNotes:
		"ו is modeled as a morpheme clitic rather than CCONJ to stress bound orthographic attachment.",
} as const;
