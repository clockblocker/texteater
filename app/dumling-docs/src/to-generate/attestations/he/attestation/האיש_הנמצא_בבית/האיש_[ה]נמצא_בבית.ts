import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ה",
			orthography: "Fused",
			fusion: {
				spelling: "הנמצא",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "נמצא", surface: "נמצא" },
				],
			},
			component: 0,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ה",
		spelling: "Canonical",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "ה",
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
	sentenceMarkdown: "האיש [ה]נמצא בבית.",
	classifierNotes:
		"ה introduces the relative participle נמצא, so it is the SCONJ that, not the article; the article ה of האיש belongs to the noun איש.",
} as const;
