import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "half",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "half",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "half",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				numForm: "Word",
				numType: "Frac",
				abbr: null,
				definite: null,
				extPos: null,
				pronType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Use [half] the flour first.",
	classifierNotes:
		"Half before a noun phrase is DET with fractional number features, not NUM.",
} as const;
