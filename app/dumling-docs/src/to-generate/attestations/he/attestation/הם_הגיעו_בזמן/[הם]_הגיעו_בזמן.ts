import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "הם",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "הם",
		spelling: "Canonical",

		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
			person: "3",
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "הם",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Prs",
				definite: null,
				reflex: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[הם] הגיעו בזמן.",
	classifierNotes: "הם is a third-person masculine plural pronoun.",
} as const;
