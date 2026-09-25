import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ש",
			orthography: "Fused",
			fusion: {
				spelling: "שתבוא",
				components: [
					{ span: "ש", surface: "ש" },
					{ span: "תבוא", surface: "תבוא" },
				],
			},
			component: 0,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ש",
		spelling: "Canonical",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "ש",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: {
				case: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "SCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "אמרת [ש]תבוא.",
	classifierNotes:
		"ש is the SCONJ that introducing the complement clause, its own Lexeme and the Fused first piece of שתבוא.",
} as const;
