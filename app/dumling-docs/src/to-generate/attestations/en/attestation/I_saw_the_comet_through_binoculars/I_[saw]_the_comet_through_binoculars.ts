import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "saw",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "saw",
		spelling: "Canonical",

		inflectionalFeatures: {
			tense: "Past",
			verbForm: "Fin",
			mood: null,
			number: null,
			person: null,
			voice: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "see",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				phrasal: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I [saw] the comet through binoculars.",
	classifierNotes:
		"Saw is the past finite surface of see, not the citation noun saw.",
} as const;
