import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "muss",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "muss",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "müssen",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				verbType: "Mod",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Er [muss] heute arbeiten.",
	classifierNotes:
		"Muss is AUX here because it combines with the overt infinitive arbeiten rather than standing alone as the clause's main predicate.",
	isVerified: true,
} as const;
