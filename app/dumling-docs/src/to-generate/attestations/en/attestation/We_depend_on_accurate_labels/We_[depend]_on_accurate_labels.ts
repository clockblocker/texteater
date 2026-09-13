import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "en",
		normalizedSurface: "depend on",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "We [depend] on accurate labels.",
	classifierNotes:
		"Depend on uses hasGovPrep rather than phrasal because on is governed by the verb.",
} as const;
