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
		"[Es] zog der wilde Jägersmann\n\t\tsein grasgrün neues Röcklein an;",
	classifierNotes:
		"I treated sentence-initial `Es` as the personal pronoun lemma `es` with nominative neuter singular inflection. In this poetic inversion it may function as expletive or presentational `es`, but the current schema has no dedicated expletive feature, so plain PRON is the closest Dumling fit.",
	isVerified: true,
} as const;
