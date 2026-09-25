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
			complement: { kind: "Case", case: "Acc", referent: "Either" },
			realizedCase: "Acc",
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
	sentenceMarkdown:
		"Der hockte da im grünen Gras;\ndem floß der Kaffee [auf] die Nas.",
	classifierNotes:
		"`auf` heads the directional phrase `auf die Nas`, so I treated it as an ordinary preposition, not as a verbal particle. The two-way Lemma carries no case; this occurrence records the accusative of `die Nas` (wohin?) as its realized case.",
	isVerified: true,
} as const;
