import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "verheiratet",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "verheiratet",
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
			canonicalForm: "verheiraten",
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
	sentenceMarkdown: "Sie ist [verheiratet].",
	classifierNotes:
		"Verheiratet is treated here as a bare predicative Partizip-II form of verheiraten. Under the stricter German participle rule, non-attributive participles of lexical verbs stay VERB even when the clause expresses a stable resulting state.",
	isVerified: true,
} as const;
