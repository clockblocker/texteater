import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "wäre",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "wäre",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Sub",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
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
	sentenceMarkdown: "Das [wäre] fast schief gewesen.",
	classifierNotes:
		"The Konjunktiv-II form is mapped to supported mood Sub plus past tense.",
	isVerified: true,
} as const;
