import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "bewunderte",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "bewunderte",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: null,
			number: "Sing",
			person: null,
			tense: null,
			verbForm: "Part",
			participleForm: "Past",
			case: "Nom",
			gender: "Masc",
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
			canonicalForm: "bewundern",
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
		"Der von allen [bewunderte] Lehrer ging in den Ruhestand.",
	classifierNotes:
		"Bewunderte has a von-agent, a productive attributive Partizip II of bewundern (ADR 0033). It carries Nom Sing Masc agreement with Lehrer.",
	isVerified: true,
} as const;
