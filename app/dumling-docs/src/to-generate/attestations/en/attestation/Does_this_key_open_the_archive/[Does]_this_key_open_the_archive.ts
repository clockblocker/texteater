import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Does",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "does",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
		},
		lemma: {
			language: "en",
			canonicalForm: "do",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				abbr: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Does] this key open the archive?",
	classifierNotes:
		"Sentence-initial Does keeps normalizedSurface lowercase while clicked Text preserves casing.",
} as const;
