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
	sentenceMarkdown: "Pass [auf] dich auf!",
	classifierNotes:
		"The governed-preposition click returns the same three-member aufpassen occurrence; valencyEvidence names the first auf by index, which tells it apart from the detached prefix, and the normalized Surface pass auf leaves it out.",
	isVerified: true,
} as const;
