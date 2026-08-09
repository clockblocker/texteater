import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Meckern",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Meckern",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Meckern",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sein ständiges [Meckern] nervt.",
	classifierNotes:
		"Meckern is treated here as a substantivized infinitive, so the learner-facing unit is a neuter noun rather than the verb `meckern`. The selected form is citation-shaped for this nominal reading, so it stays `Surface/Citation`.",
	isVerified: true,
} as const;
