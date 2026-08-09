import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "wartet",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "wartet",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "warten",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "auf",
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
	sentenceMarkdown: "Er [wartet] auf den Nachtbus.",
	classifierNotes:
		"The governed preposition auf is an inherent lemma feature, not part of the surface attestation.",
	isVerified: true,
} as const;
