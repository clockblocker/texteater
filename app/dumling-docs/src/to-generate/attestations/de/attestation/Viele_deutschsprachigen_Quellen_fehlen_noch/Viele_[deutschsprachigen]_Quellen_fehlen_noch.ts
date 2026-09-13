import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "deutschsprachigen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "deutschsprachigen",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
			gender: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "deutschsprachig",
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
	sentenceMarkdown: "Viele [deutschsprachigen] Quellen fehlen noch.",
	classifierNotes:
		"Deutschsprachigen looks noun-like in isolation but is annotated as an adjective inflection here.",
	isVerified: true,
} as const;
