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
		"[Es] zog der wilde Jägersmann\n\t\tsein grasgrün neues Röcklein an;",
	classifierNotes:
		"I treated sentence-initial `Es` as the personal pronoun lemma `es` with nominative neuter singular inflection. In this poetic inversion it may function as expletive or presentational `es`, but the current schema has no dedicated expletive feature, so plain PRON is the closest Dumling fit.",
	isVerified: true,
} as const;
