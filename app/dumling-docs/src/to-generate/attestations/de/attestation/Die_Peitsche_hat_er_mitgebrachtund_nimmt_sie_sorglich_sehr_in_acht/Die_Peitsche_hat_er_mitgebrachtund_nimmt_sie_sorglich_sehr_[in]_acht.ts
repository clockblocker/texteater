import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "in",
			orthography: "Standard",
		},
		{
			attested: "acht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "in acht",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "in acht nehmen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die Peitsche hat er mitgebracht\nund nimmt sie sorglich sehr [in] acht.",
	classifierNotes:
		"I treated in as part of the idiom in acht nehmen rather than as a free adposition, because the phrase is functioning as one fixed learner-facing unit here.",
	isVerified: true,
} as const;
