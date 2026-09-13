import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "גדולה",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "גדולה",
		spelling: "Canonical",

		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
			definite: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "גדול",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "זו טעות [גדולה].",
	classifierNotes: "גדולה is a feminine singular adjective inflection.",
} as const;
