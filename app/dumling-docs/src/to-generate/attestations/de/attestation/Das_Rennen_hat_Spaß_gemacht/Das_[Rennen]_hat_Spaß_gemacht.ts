import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Rennen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Rennen",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Rennen",
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
	sentenceMarkdown: "Das [Rennen] hat Spaß gemacht.",
	classifierNotes:
		"Rennen is treated here as a substantivized infinitive used as a neuter noun. Following the repo's nominalized-verb rule and the existing Meckern example, the learner-facing unit is NOUN rather than the verb rennen.",
	isVerified: true,
} as const;
