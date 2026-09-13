import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Herzen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Herzen",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sie folgte ihrem [Herzen].",
	classifierNotes:
		"Herzen is dative singular here, not plural, despite its weak-looking ending on a neuter noun.",
	isVerified: true,
} as const;
