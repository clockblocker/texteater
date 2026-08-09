import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Filosofie",
			orthography: "Typo",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Philosophie",
		spelling: "Variant",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "Philosophie",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Im Heft stand [Filosofie] statt Philosophie.",
	classifierNotes:
		"This is a typo attestation whose noncanonical spelling still points to the canonical lemma Philosophie.",
	isVerified: true,
} as const;
