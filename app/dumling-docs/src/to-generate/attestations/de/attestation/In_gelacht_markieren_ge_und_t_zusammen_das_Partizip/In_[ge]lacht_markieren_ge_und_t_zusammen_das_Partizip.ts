import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ge",
			orthography: "Standard",
		},
		{
			attested: "t",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "ge t",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "ge-...-t",
			family: "Morpheme",
			kind: "Circumfix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Morpheme", "Circumfix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"In [ge]lacht markieren ge- und -t zusammen das Partizip.",
	classifierNotes:
		"The circumfix is modeled as one morpheme even though the selected spelling shows only its first visible segment.",
	isVerified: true,
} as const;
