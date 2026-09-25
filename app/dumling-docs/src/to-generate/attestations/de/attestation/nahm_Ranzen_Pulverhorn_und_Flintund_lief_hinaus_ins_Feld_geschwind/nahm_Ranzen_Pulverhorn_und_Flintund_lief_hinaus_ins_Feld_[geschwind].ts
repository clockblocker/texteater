import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "geschwind",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "geschwind",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: null,
			degree: "Pos",
			number: null,
			gender: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "geschwind",
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
	sentenceMarkdown:
		"nahm Ranzen, Pulverhorn und Flint\nund lief hinaus ins Feld [geschwind]",
	classifierNotes:
		"Geschwind means quickly and modifies the running event, but an adverbially used plain adjective stays ADJ (ADR 0033), with positive degree and no agreement.",
	isVerified: true,
} as const;
