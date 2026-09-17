import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ist",
			orthography: "Standard",
		},
		{
			attested: "geschrieben",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "ist geschrieben",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			perfect: null,
			future: null,
			voice: "Pass",
			passive: "State",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "schreiben",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
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
	sentenceMarkdown: "Der Brief ist schon [geschrieben].",
	classifierNotes:
		"Ist plus geschrieben preserves the productive schreiben event and forms one state-passive VERB target. The participle owns morphology and the Lemma; the auxiliary is a fixed member.",
	isVerified: true,
} as const;
