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
	sentenceMarkdown: "Pass auf dich [auf]!",
	classifierNotes:
		'The detached prefix token also points to the verbal surface `pass auf`; the governed preposition is kept separately on the Lemma as `hasGovPrep: "auf"`.',
	isVerified: true,
} as const;
