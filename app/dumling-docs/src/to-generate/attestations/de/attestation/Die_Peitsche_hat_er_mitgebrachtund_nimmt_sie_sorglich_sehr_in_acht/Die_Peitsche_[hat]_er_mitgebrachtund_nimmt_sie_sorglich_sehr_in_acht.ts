import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "hat",
			orthography: "Standard",
		},
		{
			attested: "mitgebracht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "hat mitgebracht",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: null,
			gender: null,
			mood: null,
			number: null,
			person: null,
			tense: null,
			verbForm: "Part",
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
		"Die Peitsche [hat] er mitgebracht\nund nimmt sie sorglich sehr in acht.",
	classifierNotes:
		"The perfect-auxiliary click returns the same lexical mitbringen occurrence as the participle click; head morphology remains Participle and the Lemma remains mitbringen.",
	isVerified: true,
} as const;
