import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "scissors",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "scissors",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Ptan",
		},
		lemma: {
			language: "en",
			canonicalForm: "scissors",
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
} satisfies Attestation<"en", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "These [scissors] are blunt.",
	classifierNotes:
		"Scissors uses Number=Ptan to stress plurale-tantum support.",
} as const;
