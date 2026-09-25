import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "an",
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
		normalizedSurface: "an",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "an",
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
		"Einst ging er [an] Ufers Rand\nmit der Mappe in der Hand.",
	classifierNotes:
		"`an` is the ordinary two-way preposition. The form of `Ufers Rand` does not show its case, so the occurrence records the dative of the location reading (wo?): he walks along the bank, which the next lines confirm.",
	isVerified: true,
} as const;
