import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "schweigend",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "schweigend",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: null,
			number: null,
			person: null,
			tense: null,
			verbForm: "Part",
			participleForm: "Present",
			case: null,
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
			canonicalForm: "schweigen",
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
	sentenceMarkdown: "Er saß [schweigend] am Fenster.",
	classifierNotes:
		"Schweigend is a productive adverbial Partizip I of schweigen, so it resolves to the verb (ADR 0033). An adverbial participle has no agreement.",
	isVerified: true,
} as const;
