import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Tut",
			orthography: "Standard",
		},
		{
			attested: "mir",
			orthography: "Standard",
		},
		{
			attested: "leid",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "tut mir leid",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "tut mir leid",
			family: "Phraseme",
			kind: "DiscourseFormula",
			coreFeatures: {
				discourseFormulaRole: "Apology",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Tut mir leid], das war mein Fehler.",
	classifierNotes:
		"Tut mir leid is stored as an apology phraseme, not as a literal finite-verb attestation.",
	isVerified: true,
} as const;
