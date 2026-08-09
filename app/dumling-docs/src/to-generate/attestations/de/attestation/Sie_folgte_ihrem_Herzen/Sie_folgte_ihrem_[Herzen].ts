import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Herzen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Herzen",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Herz",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sie folgte ihrem [Herzen].",
	classifierNotes:
		"Herzen is dative singular here, not plural, despite its weak-looking ending on a neuter noun.",
	isVerified: true,
} as const;
