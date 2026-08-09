import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "הם",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "הם",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
			person: "3",
		},
		lemma: {
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
} satisfies Attestation<"he", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[הם] הגיעו בזמן.",
	classifierNotes: "הם is a third-person masculine plural pronoun.",
} as const;
