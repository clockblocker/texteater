import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "gave",
			orthography: "Standard",
		},
		{
			attested: "up",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "gave up",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: null,
			number: null,
			person: null,
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "give up",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				phrasal: "Yes",
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "She gave [up] after midnight.",
	classifierNotes:
		"Clicking the particle resolves the complete phrasal-verb occurrence `gave up`; the click is one member of that Surface.",
} as const;
