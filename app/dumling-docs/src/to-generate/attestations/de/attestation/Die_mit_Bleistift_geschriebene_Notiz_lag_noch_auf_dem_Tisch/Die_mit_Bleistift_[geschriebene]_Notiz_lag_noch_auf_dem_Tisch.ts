import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "geschriebene",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "geschriebene",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: null,
			number: "Sing",
			person: null,
			tense: null,
			verbForm: "Part",
			participleForm: "Past",
			case: "Nom",
			gender: "Fem",
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
			canonicalForm: "schreiben",
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
	sentenceMarkdown:
		"Die mit Bleistift [geschriebene] Notiz lag noch auf dem Tisch.",
	classifierNotes:
		"Geschriebene keeps the writing event with its instrument mit Bleistift, a productive attributive Partizip II of schreiben (ADR 0033). It carries Nom Sing Fem agreement with Notiz.",
	isVerified: true,
} as const;
