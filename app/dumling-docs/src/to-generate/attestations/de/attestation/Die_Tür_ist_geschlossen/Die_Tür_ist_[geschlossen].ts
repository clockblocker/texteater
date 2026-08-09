import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "geschlossen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "geschlossen",
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
			canonicalForm: "schließen",
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
	sentenceMarkdown: "Die Tür ist [geschlossen].",
	classifierNotes:
		"Geschlossen is treated here as a bare predicative Partizip-II form of schließen. Under the stricter German participle rule, non-attributive participles of lexical verbs stay VERB even when the clause describes a resulting state.",
	isVerified: true,
} as const;
