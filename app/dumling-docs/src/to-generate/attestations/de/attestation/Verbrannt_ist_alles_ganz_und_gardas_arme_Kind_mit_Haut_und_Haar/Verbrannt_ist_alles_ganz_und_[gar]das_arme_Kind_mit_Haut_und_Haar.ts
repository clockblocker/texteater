import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ganz",
			orthography: "Standard",
		},
		{
			attested: "und",
			orthography: "Standard",
		},
		{
			attested: "gar",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "ganz und gar",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "ganz und gar",
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
		"Verbrannt ist alles ganz und [gar],\ndas arme Kind mit Haut und Haar;",
	classifierNotes:
		"Gar can often be a standalone intensifying adverb, and another Attestation in the repo uses that analysis. Here the Full Attestation records ganz, und, and gar because the fixed phrase as a whole carries the intended meaning.",
	isVerified: true,
} as const;
