import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "auf",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	valencyEvidence: [
		{
			member: null,
			complement: { kind: "Case", case: "Dat", referent: "Either" },
			realizedCase: "Dat",
		},
	],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "auf",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "auf",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				abbr: null,
				extPos: null,
				foreign: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das rote Band lag [auf] dem Geschenk.",
	classifierNotes:
		"`auf` heads the ordinary locative prepositional phrase `auf dem Geschenk`, so it is a plain preposition, not part of the verb `liegen`. The Lemma carries no case: `auf` is two-way in the ADP Case Table, and this occurrence records the dative of `dem Geschenk` (wo?) as its realized case.",
	isVerified: true,
} as const;
