import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "schweigend",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "schweigend",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Pres",
			verbForm: "Part",
			aspect: null,
			gender: null,
			mood: null,
			number: null,
			person: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "schweigen",
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
	sentenceMarkdown: "Er saß [schweigend] am Fenster.",
	classifierNotes:
		"Schweigend is the present participial form of schweigen used non-attributively. Under the repo's German rule for present participles, that keeps it under VERB rather than shifting it to ADJ or ADV.",
	isVerified: true,
} as const;
