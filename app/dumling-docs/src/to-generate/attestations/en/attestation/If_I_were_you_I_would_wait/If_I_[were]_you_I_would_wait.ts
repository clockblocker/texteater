import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "were",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "were",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Sub",
			tense: "Past",
			verbForm: "Fin",
			number: null,
			person: null,
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "If I [were] you, I would wait.",
	classifierNotes:
		"Were in if I were you is AUX with Mood=Sub; the schema allows mood without forcing person or number.",
} as const;
