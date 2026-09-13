import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Es",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "es",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
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
				referenceNumber: "Sing",
				case: "Nom",
				number: "Sing",
				gender: "Neut",
				"gender[psor]": null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"[Es] brennt die Hand, es brennt das Haar,\nes brennt das ganze Kind sogar.",
	classifierNotes:
		"Sentence-initial Es is capitalized in clicked Text but normalizedSurface stays lowercase. I treated it as nominative personal-pronoun es in an expletive or presentational use with a postponed nominative subject, rather than as a referential neuter pronoun.",
	isVerified: true,
} as const;
