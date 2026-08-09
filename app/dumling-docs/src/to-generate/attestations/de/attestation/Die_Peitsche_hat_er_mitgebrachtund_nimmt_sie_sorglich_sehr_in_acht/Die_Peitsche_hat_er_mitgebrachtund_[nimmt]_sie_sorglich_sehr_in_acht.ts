import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "nimmt",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "nimmt",
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
		"Die Peitsche hat er mitgebracht\nund [nimmt] sie sorglich sehr in acht.",
	classifierNotes:
		"The Full Attestation preserves the complete normalized Surface nimmt, which resolves to the fixed-expression Lemma in acht nehmen rather than a standalone nehmen inflection.",
	isVerified: true,
} as const;
