import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "gekocht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "gekocht",
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
			canonicalForm: "kochen",
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
	sentenceMarkdown: "Die Kartoffeln sind bereits [gekocht].",
	classifierNotes:
		"Gekocht is a bare predicative Partizip-II form of kochen. Even though the clause describes a resulting state, the current German participle rule keeps non-attributive participles of lexical verbs under VERB rather than shifting them to ADJ.",
	isVerified: true,
} as const;
