import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ist",
			orthography: "Standard",
		},
		{
			attested: "geschlossen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "ist geschlossen",
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
			voice: "Pass",
			passive: "State",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "schließen",
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
	sentenceMarkdown: "Die Tür ist [geschlossen].",
	classifierNotes:
		"Ist plus geschlossen preserves the productive schließen event and matches TIGER's state-passive analysis. Both forms are fixed members of one VERB target under schließen.",
	isVerified: true,
} as const;
