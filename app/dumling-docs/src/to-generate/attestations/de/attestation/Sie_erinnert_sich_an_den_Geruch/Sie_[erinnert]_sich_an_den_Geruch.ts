import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "erinnert",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "erinnert",
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
			canonicalForm: "sich erinnern",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				lexicallyReflexive: "Yes",
				hasGovPrep: "an",
				hasSepPrefix: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sie [erinnert] sich an den Geruch.",
	classifierNotes:
		"The lemma is lexically reflexive, but the attested member excludes sich; reflexivity stays inherent on the Lemma.",
	isVerified: true,
} as const;
