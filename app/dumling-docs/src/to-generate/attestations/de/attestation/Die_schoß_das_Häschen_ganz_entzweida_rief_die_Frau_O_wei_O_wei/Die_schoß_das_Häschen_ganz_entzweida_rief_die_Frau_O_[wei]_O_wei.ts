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
		"Die schoß das Häschen ganz entzwei;\nda rief die Frau: »O [wei]! O wei!«",
	classifierNotes:
		"The Full Attestation records both members O and wei of the reaction formula; the docs review span on wei does not make it an independent Lexeme.",
	isVerified: true,
} as const;
