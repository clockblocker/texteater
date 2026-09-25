import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "scissors",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "scissors",
		spelling: "Canonical",

		inflectionalFeatures: {
			article: "None",
			number: "Ptan",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "These [scissors] are blunt.",
	classifierNotes:
		"Scissors uses Number=Ptan to stress plurale-tantum support.",
} as const;
