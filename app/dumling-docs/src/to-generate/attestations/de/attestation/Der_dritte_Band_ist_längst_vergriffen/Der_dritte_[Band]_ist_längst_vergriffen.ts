import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Der",
			orthography: "Standard",
		},
		{
			attested: "Band",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			article: "Definite",
			case: "Nom",
			number: "Sing",
		},
		language: "de",
		normalizedSurface: "Band",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Band",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Der dritte [Band] ist längst vergriffen.",
	classifierNotes:
		"The book-volume use resolves to the masculine Band Lemma, distinct through its Core Features from the feminine and neuter Band Lemmas.",
	isVerified: true,
} as const;
