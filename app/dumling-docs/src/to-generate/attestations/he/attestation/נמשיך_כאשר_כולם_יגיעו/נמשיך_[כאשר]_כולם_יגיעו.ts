import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "כאשר",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "כאשר",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "כאשר",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: {
				case: "Tem",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "נמשיך [כאשר] כולם יגיעו.",
	classifierNotes:
		"כאשר is SCONJ with temporal case because the schema exposes that feature for Hebrew subordinators.",
} as const;
