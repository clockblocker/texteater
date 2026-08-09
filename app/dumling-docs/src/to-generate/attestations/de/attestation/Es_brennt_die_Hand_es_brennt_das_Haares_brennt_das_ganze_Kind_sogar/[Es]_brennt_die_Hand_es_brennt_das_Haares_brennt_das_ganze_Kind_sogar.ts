import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Es",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "es",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Neut",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "es",
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
		"[Es] brennt die Hand, es brennt das Haar,\nes brennt das ganze Kind sogar.",
	classifierNotes:
		"Sentence-initial Es is capitalized in clicked Text but normalizedSurface stays lowercase. I treated it as nominative personal-pronoun es in an expletive or presentational use with a postponed nominative subject, rather than as a referential neuter pronoun.",
	isVerified: true,
} as const;
