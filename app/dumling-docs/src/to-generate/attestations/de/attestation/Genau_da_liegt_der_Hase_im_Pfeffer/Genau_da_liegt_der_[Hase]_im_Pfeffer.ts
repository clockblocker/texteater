import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "da liegt der hase im pfeffer",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "da liegt der Hase im Pfeffer",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Genau da liegt der [Hase] im Pfeffer.",
	classifierNotes:
		"The Full Attestation records the complete opaque idiom occurrence; the docs review span on Hase does not classify it as the lexical noun Hase.",
	isVerified: true,
} as const;
