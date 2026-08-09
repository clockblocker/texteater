import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Geh",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "geh",
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
			canonicalForm: "gehen",
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
	sentenceMarkdown: "[Geh] bitte nicht ohne Jacke raus.",
	classifierNotes:
		"Imperative forms use mood Imp together with finite verbForm in the schema.",
	isVerified: true,
} as const;
