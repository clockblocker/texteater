import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Whose",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "whose",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Gen",
			gender: null,
			number: null,
			reflex: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "who",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				poss: "Yes",
				pronType: "Int",
				abbr: null,
				extPos: null,
				person: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Whose] keys are these?",
	classifierNotes:
		"Whose is attached to who with possessive and interrogative Core Features plus genitive Surface case.",
} as const;
