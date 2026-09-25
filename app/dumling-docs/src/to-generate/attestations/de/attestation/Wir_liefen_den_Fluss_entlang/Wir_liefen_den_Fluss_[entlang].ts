import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "entlang",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	valencyEvidence: [
		{
			member: null,
			complement: { kind: "Case", case: "Acc", referent: "Either" },
			realizedCase: "Acc",
		},
	],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "entlang",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "entlang",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Post",
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
	sentenceMarkdown: "Wir liefen den Fluss [entlang].",
	classifierNotes:
		"Entlang is treated as a postposition rather than an adverb because of its syntactic relation to den Fluss.",
	isVerified: true,
} as const;
