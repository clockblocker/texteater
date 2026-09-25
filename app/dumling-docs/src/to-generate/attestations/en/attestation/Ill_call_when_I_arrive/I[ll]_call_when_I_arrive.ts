import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "'ll",
			orthography: "Fused",
			fusion: {
				spelling: "I'll",
				components: [
					{ span: "I", surface: "I" },
					{ span: "'ll", surface: "will" },
				],
			},
			component: 1,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "will",
		spelling: "Canonical",
		inflectionalFeatures: {
			verbForm: "Fin",
			mood: null,
			number: null,
			person: null,
			tense: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "will",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				abbr: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I['ll] call when I arrive.",
	classifierNotes:
		"'ll is the AUX will, attested as the second piece of the fused word I'll. The member is Fused and names its Fusion, so the Surface stays will; the shortening is a fact about the written occurrence, not a Variant Surface.",
} as const;
