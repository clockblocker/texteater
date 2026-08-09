import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "מכתבים",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "מכתבים",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
			definite: null,
		},
		lemma: {
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
} satisfies Attestation<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "מצאתי [מכתבים] ישנים.",
	classifierNotes:
		"מכתבים is the plural noun from מכתב, not a verb-root attestation.",
} as const;
