import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "אני",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "אני",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
			person: "1",
			gender: null,
		},
		lemma: {
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
} satisfies Attestation<"he", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[אני] לא בטוחה.",
	classifierNotes:
		"The first-person pronoun has person and number but no gender feature.",
} as const;
