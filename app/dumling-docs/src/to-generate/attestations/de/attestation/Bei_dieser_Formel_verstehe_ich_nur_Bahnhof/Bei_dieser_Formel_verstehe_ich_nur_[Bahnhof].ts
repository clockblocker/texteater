import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "verstehe",
			orthography: "Standard",
		},
		{
			attested: "nur",
			orthography: "Standard",
		},
		{
			attested: "Bahnhof",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "verstehe nur Bahnhof",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "1",
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "nur Bahnhof verstehen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Bei dieser Formel verstehe ich nur [Bahnhof].",
	classifierNotes:
		"Clicking Bahnhof resolves the complete discontinuous idiom occurrence `verstehe … nur Bahnhof`; `ich` lies between participating Text segments but is not a Surface member.",
	isVerified: true,
} as const;
