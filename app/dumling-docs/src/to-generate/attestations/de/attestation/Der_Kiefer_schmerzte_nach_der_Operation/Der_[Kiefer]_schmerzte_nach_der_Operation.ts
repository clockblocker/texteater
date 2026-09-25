import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Der",
			orthography: "Standard",
		},
		{
			attested: "Kiefer",
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
		normalizedSurface: "Kiefer",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Kiefer",
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
	sentenceMarkdown: "Der [Kiefer] schmerzte nach der Operation.",
	classifierNotes:
		"The jaw use resolves to the masculine Kiefer Lemma, distinct through its Core Features from the feminine pine-tree Lemma.",
	isVerified: true,
} as const;
