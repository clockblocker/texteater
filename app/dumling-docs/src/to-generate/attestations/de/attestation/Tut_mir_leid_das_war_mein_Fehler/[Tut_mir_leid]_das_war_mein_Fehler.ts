import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
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
		language: "de",
		normalizedSurface: "tut mir leid",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Tut mir leid], das war mein Fehler.",
	classifierNotes:
		"Tut mir leid is stored as an apology phraseme, not as a literal finite-verb attestation.",
	isVerified: true,
} as const;
