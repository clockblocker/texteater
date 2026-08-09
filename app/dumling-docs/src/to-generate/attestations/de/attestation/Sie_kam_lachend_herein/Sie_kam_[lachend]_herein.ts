import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "lachend",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "lachend",
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
			canonicalForm: "lachen",
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
	sentenceMarkdown: "Sie kam [lachend] herein.",
	classifierNotes:
		"Lachend is the present participial form of lachen used non-attributively, so under the repo's German participle rule it stays VERB rather than shifting to ADJ or ADV.",
	isVerified: true,
} as const;
