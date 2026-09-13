import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "כאשר",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "כאשר",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"he", "Lexeme", "SCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "נמשיך [כאשר] כולם יגיעו.",
	classifierNotes:
		"כאשר is SCONJ with temporal case because the schema exposes that feature for Hebrew subordinators.",
} as const;
