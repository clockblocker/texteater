import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "zog",
			orthography: "Standard",
		},
		{
			attested: "an",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "zog an",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "anziehen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "an",
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
		"Es zog der wilde Jägersmann\n\tsein grasgrün neues Röcklein [an];",
	classifierNotes:
		"The detached prefix token is still classified against the same separable verbal surface `zog an`, following the existing Dumling pattern for split verbs like `pass auf`.",
	isVerified: true,
} as const;
