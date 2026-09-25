import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "stolz",
			orthography: "Standard",
		},
		{
			attested: "auf",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
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
		normalizedSurface: "stolz",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: null,
			degree: "Pos",
			gender: null,
			number: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "stolz",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Er ist [stolz] auf seinen Sohn.",
	classifierNotes:
		"An adjective takes in the preposition it governs, as a verb does: auf is an occurrence member, so a click on it opens stolz, and valencyEvidence names it by index with auf + Acc. It is not a Fixed member, so the normalized Surface is stolz. The copula ist stays its own VERB and forms no Collocation with the predicative adjective.",
	isVerified: true,
} as const;
