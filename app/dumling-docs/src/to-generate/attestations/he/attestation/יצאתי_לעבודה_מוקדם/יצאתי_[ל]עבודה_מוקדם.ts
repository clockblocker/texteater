import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ל",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "ל",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "ל",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "יצאתי [ל]עבודה מוקדם.",
	classifierNotes:
		"ל is treated as a prefix morpheme, not a full adposition lexeme, because it is selected inside an attached form.",
} as const;
