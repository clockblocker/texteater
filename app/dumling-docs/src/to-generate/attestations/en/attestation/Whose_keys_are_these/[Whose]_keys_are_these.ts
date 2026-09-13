import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Whose",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "whose",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Gen",
			gender: null,
			number: null,
			reflex: null,
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Whose] keys are these?",
	classifierNotes:
		"Whose is attached to who with possessive and interrogative Core Features plus genitive Surface case.",
} as const;
