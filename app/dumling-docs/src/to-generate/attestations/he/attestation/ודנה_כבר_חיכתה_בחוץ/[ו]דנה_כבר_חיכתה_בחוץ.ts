import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ו",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ו",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "ו",
			family: "Morpheme",
			kind: "Clitic",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Morpheme", "Clitic">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[ו]דנה כבר חיכתה בחוץ.",
	classifierNotes:
		"ו is modeled as a morpheme clitic rather than CCONJ to stress bound orthographic attachment.",
} as const;
