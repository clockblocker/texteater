import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "BVG",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "BVG",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "BVG",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				abbr: "Yes",
				foreign: null,
				gender: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "In Berlin betreibt die [BVG] die U-Bahn.",
	classifierNotes:
		'`BVG` is a proper-noun abbreviation, so `abbr: "Yes"` belongs on the Lemma\'s inherent feature bag.',
} as const;
