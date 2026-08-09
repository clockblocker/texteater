import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "da",
			orthography: "Standard",
		},
		{
			attested: "liegt",
			orthography: "Standard",
		},
		{
			attested: "der",
			orthography: "Standard",
		},
		{
			attested: "Hase",
			orthography: "Standard",
		},
		{
			attested: "im",
			orthography: "Standard",
		},
		{
			attested: "Pfeffer",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "da liegt der hase im pfeffer",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "da liegt der Hase im Pfeffer",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Genau da liegt der [Hase] im Pfeffer.",
	classifierNotes:
		"The Full Attestation records the complete opaque idiom occurrence; the docs review span on Hase does not classify it as the lexical noun Hase.",
	isVerified: true,
} as const;
