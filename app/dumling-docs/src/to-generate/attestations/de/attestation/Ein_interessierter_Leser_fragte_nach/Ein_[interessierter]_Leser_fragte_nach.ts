import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "interessierter",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "interessierter",
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
			canonicalForm: "interessiert",
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
	sentenceMarkdown: "Ein [interessierter] Leser fragte nach.",
	classifierNotes:
		"Interessierter is an attributive adjective inflection modifying Leser, with nominative masculine singular agreement. Because the head noun is overt, this is neither a substantivized NOUN analysis nor a verbal-participle Lemma.",
	isVerified: true,
} as const;
