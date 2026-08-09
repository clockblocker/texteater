import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
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
		language: "en",
		normalizedSurface: "gave up",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: null,
			number: null,
			person: null,
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
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
} satisfies Attestation<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "She gave [up] after midnight.",
	classifierNotes:
		"Clicking the particle resolves the complete phrasal-verb occurrence `gave up`; the click is one member of that Surface.",
} as const;
