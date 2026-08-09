import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Running",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "running",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			verbForm: "Ger",
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "run",
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
	sentenceMarkdown: "[Running] before breakfast clears my head.",
	classifierNotes:
		"Gerund running is a VERB inflection, not a noun, despite occupying a nominal clause position.",
} as const;
