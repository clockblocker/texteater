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
			kind: "DET",
			coreFeatures: {
				pronType: "Dem",
				abbr: null,
				definite: null,
				extPos: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Move [that] chair, please.",
	classifierNotes:
		"That before a noun is DET, distinct from pronominal and complementizer that.",
} as const;
