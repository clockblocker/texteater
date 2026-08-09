import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "See",
			orthography: "Standard",
		},
		{
			attested: "you",
			orthography: "Standard",
		},
		{
			attested: "later",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "see you later",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "see you later",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Farewell",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[See] you later at the station.",
	classifierNotes:
		"Only See is selected, but the intended formula is see you later.",
} as const;
