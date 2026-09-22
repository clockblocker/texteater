import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "verstehe nur Bahnhof",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "1",
			tense: "Pres",
			verbForm: "Fin",
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "nur Bahnhof verstehen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Bei dieser Formel verstehe ich nur [Bahnhof].",
	classifierNotes:
		"Clicking Bahnhof resolves the complete discontinuous idiom occurrence `verstehe … nur Bahnhof`; `ich` lies between participating Text segments but is not a Surface member.",
	isVerified: true,
} as const;
