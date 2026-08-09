import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "lead",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "lead",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The pipe contained traces of [lead].",
	classifierNotes:
		"Material lead is a noun lexeme; pronunciation is not represented in the current model.",
} as const;
