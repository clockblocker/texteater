import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "eingezeichnet",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "eingezeichnet",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
			gender: null,
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "einzeichnen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "ein",
				hasGovPrep: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Auf der Karte sind drei Seen [eingezeichnet].",
	classifierNotes:
		"Eingezeichnet is treated as the perfect participle of separable einzeichnen. Under the current German rule, attributive participles like eingezeichneten in die eingezeichneten Seen go to ADJ, but this bare predicative Partizip-II form stays VERB despite the result-state reading.",
	isVerified: true,
} as const;
