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
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "gekochten",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
			gender: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "gekocht",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die [gekochten] Kartoffeln standen schon bereit.",
	classifierNotes:
		"Gekochten is an attributive participial adjective modifying Kartoffeln. Because it is a noun-modifying agreement form, the current German rule stores it as ADJ rather than as a verbal participle.",
	isVerified: true,
} as const;
