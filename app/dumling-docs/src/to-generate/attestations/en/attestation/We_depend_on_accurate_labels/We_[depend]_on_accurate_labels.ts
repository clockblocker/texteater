import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "depend",
			orthography: "Standard",
		},
		{
			attested: "on",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "depend on",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "depend on",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "on",
				abbr: null,
				extPos: null,
				phrasal: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "We [depend] on accurate labels.",
	classifierNotes:
		"Depend on uses hasGovPrep rather than phrasal because on is governed by the verb.",
} as const;
