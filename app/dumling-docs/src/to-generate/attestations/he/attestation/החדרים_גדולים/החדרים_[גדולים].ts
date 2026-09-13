import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "גדולים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "גדולים",
		spelling: "Canonical",

		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
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
	sentenceMarkdown: "החדרים [גדולים].",
	classifierNotes: "גדולים is a masculine plural adjective inflection.",
} as const;
