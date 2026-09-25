import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "gewesen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "gewesen",
		spelling: "Canonical",

		inflectionalFeatures: {
			participleForm: "Past",
			verbForm: "Part",
			mood: null,
			number: null,
			person: null,
			tense: null,
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "sein",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das wäre schön [gewesen].",
	classifierNotes:
		"Gewesen is treated as an AUX participle rather than a lexical verb.",
	isVerified: true,
} as const;
