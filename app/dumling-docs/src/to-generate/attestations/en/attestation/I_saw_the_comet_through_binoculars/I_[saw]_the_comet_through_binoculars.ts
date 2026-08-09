import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "saw",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "saw",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Past",
			verbForm: "Fin",
			mood: null,
			number: null,
			person: null,
			voice: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "see",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				phrasal: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I [saw] the comet through binoculars.",
	classifierNotes:
		"Saw is the past finite surface of see, not the citation noun saw.",
} as const;
