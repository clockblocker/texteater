import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "übergesetzt",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "übergesetzt",
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
			canonicalForm: "übersetzen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Der Fährmann hat uns [übergesetzt].",
	classifierNotes:
		"This is the ferry-across participle, with related spelling but a different verbal use.",
	isVerified: true,
} as const;
