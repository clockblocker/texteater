import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "that",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "that",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "that",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: {
				abbr: null,
				extPos: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I know [that] you tried.",
	classifierNotes:
		"Complementizer that is SCONJ; no clause-type feature exists, so POS carries the distinction.",
} as const;
