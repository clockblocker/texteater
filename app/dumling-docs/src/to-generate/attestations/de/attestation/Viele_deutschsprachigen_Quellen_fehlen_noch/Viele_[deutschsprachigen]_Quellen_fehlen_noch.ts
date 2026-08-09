import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "deutschsprachigen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "deutschsprachigen",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
			gender: null,
		},
		lemma: {
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Viele [deutschsprachigen] Quellen fehlen noch.",
	classifierNotes:
		"Deutschsprachigen looks noun-like in isolation but is annotated as an adjective inflection here.",
	isVerified: true,
} as const;
