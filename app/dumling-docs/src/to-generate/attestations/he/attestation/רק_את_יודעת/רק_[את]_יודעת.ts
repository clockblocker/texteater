import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "את",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "את",
		spelling: "Canonical",

		inflectionalFeatures: {
			gender: "Fem",
			number: "Sing",
			person: "2",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "רק [את] יודעת.",
	classifierNotes:
		"את is the pronoun homograph here, modeled with feminine second-person features.",
} as const;
