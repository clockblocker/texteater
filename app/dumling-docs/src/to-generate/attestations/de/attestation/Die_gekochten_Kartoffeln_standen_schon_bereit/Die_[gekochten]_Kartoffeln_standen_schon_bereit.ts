import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "gekochten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "gekochten",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
			gender: null,
		},
		lemma: {
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die [gekochten] Kartoffeln standen schon bereit.",
	classifierNotes:
		"Gekochten is an attributive participial adjective modifying Kartoffeln. Because it is a noun-modifying agreement form, the current German rule stores it as ADJ rather than as a verbal participle.",
	isVerified: true,
} as const;
