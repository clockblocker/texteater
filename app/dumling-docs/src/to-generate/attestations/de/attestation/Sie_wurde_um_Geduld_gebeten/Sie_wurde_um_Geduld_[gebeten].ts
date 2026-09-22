import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
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
	expletiveEvidence: null,
	governedPrepositionEvidence: { attested: "um", orthography: "Standard" },
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "wurde um gebeten",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			expletive: null,
			perfect: null,
			future: null,
			voice: "Pass",
			passive: "Process",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "bitten",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sie wurde um Geduld [gebeten].",
	classifierNotes:
		"Passive wurde and governed um are fixed members, while the route-owning lexical head remains the ordinary participle gebeten with null tense and voice.",
	isVerified: true,
} as const;
