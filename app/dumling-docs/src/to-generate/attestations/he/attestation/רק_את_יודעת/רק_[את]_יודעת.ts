import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "את",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "את",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
			person: "2",
		},
		lemma: {
			language: "he",
			canonicalForm: "את",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Prs",
				definite: null,
				reflex: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "רק [את] יודעת.",
	classifierNotes:
		"את is the pronoun homograph here, modeled with feminine second-person features.",
} as const;
