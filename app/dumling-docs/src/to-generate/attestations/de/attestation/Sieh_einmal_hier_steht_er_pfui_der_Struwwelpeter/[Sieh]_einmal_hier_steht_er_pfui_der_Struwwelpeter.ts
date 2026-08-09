import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Sieh",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "sieh",
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
			canonicalForm: "sehen",
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
	sentenceMarkdown:
		"[Sieh] einmal, hier steht er, \npfui, der Struwwelpeter!",
	classifierNotes:
		"I kept Sieh as the imperative inflection of sehen rather than treating Sieh einmal as one larger formula; the sentence-initial capital remains only in clicked Text.",
	isVerified: true,
} as const;
