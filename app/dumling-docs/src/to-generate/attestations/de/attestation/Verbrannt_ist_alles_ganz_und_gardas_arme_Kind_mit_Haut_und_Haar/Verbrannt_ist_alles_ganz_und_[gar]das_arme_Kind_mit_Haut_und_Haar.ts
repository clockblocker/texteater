import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "ganz und gar",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "ganz und gar",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Verbrannt ist alles ganz und [gar],\ndas arme Kind mit Haut und Haar;",
	classifierNotes:
		"Gar can often be a standalone intensifying adverb, and another Attestation in the repo uses that analysis. Here the Full Attestation records ganz, und, and gar because the fixed phrase as a whole carries the intended meaning.",
	isVerified: true,
} as const;
