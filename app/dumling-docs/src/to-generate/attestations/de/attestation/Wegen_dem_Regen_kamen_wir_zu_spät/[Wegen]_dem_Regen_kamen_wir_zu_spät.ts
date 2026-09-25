import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Wegen",
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
		normalizedSurface: "wegen",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "wegen",
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
	sentenceMarkdown: "[Wegen] dem Regen kamen wir zu spät.",
	classifierNotes:
		"`wegen` takes a colloquial dative here. The ADP Case Table keeps genitive as its preferred case, so the Lemma stays the same `wegen` and the occurrence records the dative it realized.",
	classificationMistakes:
		"Reading belongs to a later layer; this Dumling Attestation only resolves the reviewed adposition `wegen`.",
} as const;
