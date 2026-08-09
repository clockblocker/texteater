import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "sie",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "sie",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			gender: "Fem",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "sie",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "3",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die Peitsche hat er mitgebracht\nund nimmt [sie] sorglich sehr in acht.",
	classifierNotes:
		"Sie is the accusative feminine singular object pronoun referring back to Peitsche, not nominative plural or polite Sie.",
	isVerified: true,
} as const;
