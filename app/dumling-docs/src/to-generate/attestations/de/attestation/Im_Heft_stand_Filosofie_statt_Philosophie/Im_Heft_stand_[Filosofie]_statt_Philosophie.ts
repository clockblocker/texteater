import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Filosofie",
			orthography: "Typo",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Philosophie",
		spelling: "Variant",

		inflectionalFeatures: {
			article: null,
			case: "Nom",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Im Heft stand [Filosofie] statt Philosophie.",
	classifierNotes:
		"This is a typo attestation whose noncanonical spelling still points to the canonical lemma Philosophie.",
	isVerified: true,
} as const;
