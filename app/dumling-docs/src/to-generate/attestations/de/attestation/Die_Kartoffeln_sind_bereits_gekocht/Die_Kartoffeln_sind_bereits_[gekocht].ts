import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "sind",
			orthography: "Standard",
		},
		{
			attested: "gekocht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "sind gekocht",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Plur",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			expletive: null,
			perfect: null,
			future: null,
			voice: "Pass",
			passive: "State",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "kochen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
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
	sentenceMarkdown: "Die Kartoffeln sind bereits [gekocht].",
	classifierNotes:
		"Sind plus gekocht preserves the productive kochen event and forms one state-passive VERB target. The participle owns morphology and the Lemma; the auxiliary is a fixed member.",
	isVerified: true,
} as const;
