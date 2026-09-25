import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "eingezeichneten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "eingezeichneten",
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
			canonicalForm: "einzeichnen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "ein",
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die [eingezeichneten] Seen sind jetzt besser zu sehen.",
	classifierNotes:
		"Eingezeichneten is a productive attributive Partizip II of einzeichnen, so it resolves to the verb (ADR 0033) and carries its Nom Plur agreement with Seen.",
	isVerified: true,
} as const;
