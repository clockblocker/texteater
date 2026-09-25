import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "lead",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			article: "None",
			number: "Sing",
		},
		language: "en",
		normalizedSurface: "lead",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "lead",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The pipe contained traces of [lead].",
	classifierNotes:
		"Material lead is a noun lexeme; pronunciation is not represented in the current model.",
} as const;
