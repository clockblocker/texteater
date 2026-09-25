import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Pass",
			orthography: "Standard",
		},
		{
			attested: "auf",
			orthography: "Standard",
		},
		{
			attested: "auf",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	valencyEvidence: [
		{
			member: 1,
			complement: {
				kind: "Preposition",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "auf",
					coreFeatures: {
						abbr: null,
						adpType: "Prep",
						extPos: null,
						foreign: null,
						partType: null,
					},
				},
				case: "Acc",
				referent: "Someone",
			},
			realizedCase: "Acc",
		},
	],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "pass auf",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Imp",
			number: "Sing",
			person: "2",
			verbForm: "Fin",
			tense: null,
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "aufpassen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "auf",
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Pass] auf dich auf!",
	classifierNotes:
		"Pass, governed auf, and detached-prefix auf are three members distinguished by source position; governed auf is valency evidence rather than a Fixed member, and free reflexive object dich remains separate.",
	isVerified: true,
} as const;
