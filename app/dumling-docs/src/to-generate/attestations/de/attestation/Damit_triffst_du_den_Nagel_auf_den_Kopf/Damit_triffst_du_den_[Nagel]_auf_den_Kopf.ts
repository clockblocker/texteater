import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "den",
			orthography: "Standard",
		},
		{
			attested: "Nagel",
			orthography: "Standard",
		},
		{
			attested: "auf",
			orthography: "Standard",
		},
		{
			attested: "den",
			orthography: "Standard",
		},
		{
			attested: "Kopf",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "den nagel auf den kopf",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "den Nagel auf den Kopf treffen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Damit triffst du den [Nagel] auf den Kopf.",
	classifierNotes:
		"The inflected sentence form points to the citation phraseme; the attested member is only an internal component.",
	isVerified: true,
} as const;
