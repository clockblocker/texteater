import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "abgestimmte",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "abgestimmte",
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
			canonicalForm: "abstimmen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "ab",
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die auf ihn [abgestimmte] Lösung half sofort.",
	classifierNotes:
		"Abgestimmte is a productive attributive Partizip II of abstimmen with its auf-complement, so it resolves to the verb (ADR 0033) and carries Nom Sing Fem agreement.",
	isVerified: true,
} as const;
