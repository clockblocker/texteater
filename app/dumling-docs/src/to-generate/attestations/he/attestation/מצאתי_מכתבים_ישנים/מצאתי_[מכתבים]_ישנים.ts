import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "מכתבים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "מכתבים",
		spelling: "Canonical",

		inflectionalFeatures: {
			number: "Plur",
			definite: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "מכתב",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "מצאתי [מכתבים] ישנים.",
	classifierNotes:
		"מכתבים is the plural noun from מכתב, not a verb-root attestation.",
} as const;
