import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "o wei",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die schoß das Häschen ganz entzwei;\nda rief die Frau: »[O] wei! O wei!«",
	classifierNotes:
		"I linked the selected O to the whole exclamation o wei as a discourse formula, not to a standalone interjection token. That follows the dumling preference for preserving the meaning-bearing multiword formula when a learner highlights only one part of it.",
	isVerified: true,
} as const;
