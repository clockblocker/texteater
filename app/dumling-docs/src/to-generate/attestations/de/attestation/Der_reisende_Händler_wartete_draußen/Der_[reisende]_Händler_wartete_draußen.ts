import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "reisende",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "reisende",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "reisend",
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
	sentenceMarkdown: "Der [reisende] Händler wartete draußen.",
	classifierNotes:
		"Reisende is an attributive participial adjective modifying Haendler, with nominative masculine singular agreement. Because the head noun is overt, this is classified as ADJ rather than as the substantivized NOUN analysis used in Der Reisende wartete draussen.",
	isVerified: true,
} as const;
