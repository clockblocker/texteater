import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "O",
			orthography: "Standard",
		},
		{
			attested: "wei",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "o wei",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "o wei",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Reaction",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die schoß das Häschen ganz entzwei;\nda rief die Frau: »[O] wei! O wei!«",
	classifierNotes:
		"I linked the selected O to the whole exclamation o wei as a discourse formula, not to a standalone interjection token. That follows the dumling preference for preserving the meaning-bearing multiword formula when a learner highlights only one part of it.",
	isVerified: true,
} as const;
