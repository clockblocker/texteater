import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Pass",
			orthography: "Standard",
		},
		{
			attested: "auf",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "pass auf",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Sing",
			person: "2",
			verbForm: "Fin",
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "aufpassen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "auf",
				hasSepPrefix: "auf",
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Pass] auf dich auf!",
	classifierNotes:
		'The finite verb token stays on the verbal surface `pass auf`; government is encoded on the Lemma with `hasGovPrep: "auf"`, not by building a separate governed-preposition surface.',
	isVerified: true,
} as const;
