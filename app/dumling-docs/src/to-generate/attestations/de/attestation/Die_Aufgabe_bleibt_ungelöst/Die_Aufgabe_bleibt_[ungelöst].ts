import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ungelöst",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "ungelöst",
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
			canonicalForm: "lösen",
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
	sentenceMarkdown: "Die Aufgabe bleibt [ungelöst].",
	classifierNotes:
		"Ungelöst is treated here as a bare predicative Partizip-II form of lösen. Even though bleibt ungelöst strongly suggests a state reading, the stricter German participle rule keeps non-attributive participles of lexical verbs under VERB rather than shifting them to ADJ.",
	isVerified: true,
} as const;
