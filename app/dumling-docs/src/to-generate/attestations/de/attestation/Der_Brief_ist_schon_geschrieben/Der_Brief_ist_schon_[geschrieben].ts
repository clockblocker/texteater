import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "geschrieben",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "geschrieben",
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
			canonicalForm: "schreiben",
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
	sentenceMarkdown: "Der Brief ist schon [geschrieben].",
	classifierNotes:
		"Geschrieben is a bare predicative Partizip-II form of schreiben. Under the current German verb rule, non-attributive participles of lexical verbs stay VERB rather than shifting to ADJ.",
	isVerified: true,
} as const;
