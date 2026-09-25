import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "gekochten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "gekochten",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: null,
			number: "Plur",
			person: null,
			tense: null,
			verbForm: "Part",
			participleForm: "Past",
			case: "Nom",
			gender: null,
			degree: null,
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "kochen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die [gekochten] Kartoffeln standen schon bereit.",
	classifierNotes:
		"Gekochten is a productive attributive Partizip II of kochen, so it resolves to the verb (ADR 0033) and carries Nom Plur agreement with Kartoffeln.",
	isVerified: true,
} as const;
