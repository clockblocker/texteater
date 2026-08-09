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
		"Die schoß das Häschen ganz entzwei;\nda rief die Frau: »O [wei]! O wei!«",
	classifierNotes:
		"The Full Attestation records both members O and wei of the reaction formula; the docs review span on wei does not make it an independent Lexeme.",
	isVerified: true,
} as const;
