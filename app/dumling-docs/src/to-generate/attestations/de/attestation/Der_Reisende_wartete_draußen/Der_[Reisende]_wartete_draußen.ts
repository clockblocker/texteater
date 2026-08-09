import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Reisende",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Reisende",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Reisende",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Der [Reisende] wartete draußen.",
	classifierNotes:
		"Reisende is treated here as a substantivized present participle, so the learner-facing unit is a noun rather than an adjective or verb. The selected form is already citation-shaped for this nominal reading, so it stays `Surface/Citation`.",
	isVerified: true,
} as const;
