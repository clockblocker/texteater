import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "read",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "read",
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
			canonicalForm: "read",
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
	sentenceMarkdown: "Yesterday I [read] the warning twice.",
	classifierNotes:
		"Past-tense read is orthographically identical to the citation form; the distinction lives only in surfaceKind and inflectionalFeatures.",
} as const;
