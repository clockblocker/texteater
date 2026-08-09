import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "fast",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "fast",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "fast",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das wäre [fast] schief gewesen.",
	classifierNotes:
		"Fast is the approximative adverb here, modifying the predication schief gewesen rather than functioning as an adjective or particle.",
	isVerified: true,
} as const;
