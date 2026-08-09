import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "take",
			orthography: "Standard",
		},
		{
			attested: "off",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "take off",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "take off",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				phrasal: "Yes",
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The plane will [take] off at dawn.",
	classifierNotes:
		"Only the verb component is selected, but the Lemma and surface are the phrasal verb take off.",
} as const;
