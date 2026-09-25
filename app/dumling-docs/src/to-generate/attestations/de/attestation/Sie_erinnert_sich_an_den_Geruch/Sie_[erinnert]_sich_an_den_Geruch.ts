import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "erinnert",
			orthography: "Standard",
		},
		{
			attested: "sich",
			orthography: "Standard",
		},
		{
			attested: "an",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	valencyEvidence: [
		{
			member: 2,
			complement: {
				kind: "Preposition",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "an",
					coreFeatures: {
						abbr: null,
						adpType: "Prep",
						extPos: null,
						foreign: null,
						governedCase: null,
						partType: null,
					},
				},
				case: "Acc",
				referent: "Something",
			},
			realizedCase: "Acc",
		},
	],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "erinnert sich",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "sich erinnern",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				lexicallyReflexive: "Yes",
				hasSepPrefix: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sie [erinnert] sich an den Geruch.",
	classifierNotes:
		"The inherently reflexive sich is a Fixed member; governed an stays an occurrence member recorded in valencyEvidence and out of the normalized Surface erinnert sich. The Lemma identity remains sich erinnern with the same core features.",
	isVerified: true,
} as const;
