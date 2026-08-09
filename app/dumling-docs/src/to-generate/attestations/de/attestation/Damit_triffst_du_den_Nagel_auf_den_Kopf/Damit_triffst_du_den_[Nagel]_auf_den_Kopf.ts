import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
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
		language: "de",
		normalizedSurface: "den nagel auf den kopf",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "den Nagel auf den Kopf treffen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Damit triffst du den [Nagel] auf den Kopf.",
	classifierNotes:
		"The inflected sentence form points to the citation phraseme; the attested member is only an internal component.",
	isVerified: true,
} as const;
