import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "were",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "were",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Sub",
			tense: "Past",
			verbForm: "Fin",
			number: null,
			person: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "be",
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
	sentenceMarkdown: "If I [were] you, I would wait.",
	classifierNotes:
		"Were in if I were you is AUX with Mood=Sub; the schema allows mood without forcing person or number.",
} as const;
