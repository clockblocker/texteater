import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "schlafenden",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "schlafenden",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: null,
			number: "Plur",
			person: null,
			tense: null,
			verbForm: "Part",
			participleForm: "Present",
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
			canonicalForm: "schlafen",
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
	sentenceMarkdown: "Die [schlafenden] Kinder wurden nicht geweckt.",
	classifierNotes:
		"Schlafenden is a productive attributive Partizip I of schlafen, so it resolves to the verb (ADR 0033) and carries Nom Plur agreement with Kinder.",
	isVerified: true,
} as const;
