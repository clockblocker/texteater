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
		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "whose",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				poss: "Yes",
				pronType: "Int",
				abbr: null,
				extPos: null,
				person: null,
				style: null,
				case: "Gen",
				gender: null,
				number: null,
				reflex: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Whose] keys are these?",
	classifierNotes:
		"Whose is its own Lemma, with genitive case, possessive and interrogative Core Features; it is not a form of who.",
} as const;
