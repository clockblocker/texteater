import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "mitgebracht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "mitgebracht",
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
			canonicalForm: "mitbringen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "mit",
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
	sentenceMarkdown:
		"Die Peitsche hat er [mitgebracht]\nund nimmt sie sorglich sehr in acht.",
	classifierNotes:
		"Mitgebracht is the perfect participle of separable mitbringen; the prefix stays on the Lemma as hasSepPrefix rather than being split off in this file.",
	isVerified: true,
} as const;
