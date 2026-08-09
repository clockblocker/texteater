import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "wurde",
			orthography: "Standard",
		},
		{
			attested: "um",
			orthography: "Standard",
		},
		{
			attested: "gebeten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "wurde um gebeten",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: null,
			verbForm: "Part",
			gender: null,
			mood: null,
			number: null,
			person: null,
			tense: null,
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "bitten",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: "um",
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
	sentenceMarkdown: "Sie wurde um Geduld [gebeten].",
	classifierNotes:
		"Passive wurde and governed um are fixed members, while the route-owning lexical head remains the ordinary participle gebeten with null tense and voice.",
	isVerified: true,
} as const;
