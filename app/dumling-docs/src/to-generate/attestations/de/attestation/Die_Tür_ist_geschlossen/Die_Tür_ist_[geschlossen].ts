import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "geschlossen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "geschlossen",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: null,
			degree: "Pos",
			gender: null,
			number: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "geschlossen",
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
	sentenceMarkdown: "Die Tür ist [geschlossen].",
	classifierNotes:
		"sein plus geschlossen is a state passive: ist is the copula VERB and geschlossen the ADJ geschlossen with Participle Source schließen (ADR 0035).",
	isVerified: true,
} as const;
