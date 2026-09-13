import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "אני",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "אני",
		spelling: "Canonical",

		inflectionalFeatures: {
			number: "Sing",
			person: "1",
			gender: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "אני",
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
	sentenceMarkdown: "[אני] לא בטוחה.",
	classifierNotes:
		"The first-person pronoun has person and number but no gender feature.",
} as const;
