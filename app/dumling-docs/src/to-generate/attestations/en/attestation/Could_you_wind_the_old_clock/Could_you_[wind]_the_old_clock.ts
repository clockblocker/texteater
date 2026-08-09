import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "wind",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "wind",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "wind",
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
} satisfies Attestation<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Could you [wind] the old clock?",
	classifierNotes:
		"Wind as a verb is modeled separately from wind as weather; pronunciation contrast is outside the object.",
} as const;
