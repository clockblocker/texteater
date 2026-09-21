import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Verbrannt",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "verbrannt",
		spelling: "Canonical",

		inflectionalFeatures: {
			participleForm: "Past",
			verbForm: "Part",
			mood: null,
			number: null,
			person: null,
			tense: null,
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "verbrennen",
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
	sentenceMarkdown:
		"[Verbrannt] ist alles ganz und gar,\ndas arme Kind mit Haut und Haar;",
	classifierNotes:
		"I treated Verbrannt as the participial verb form of verbrennen rather than as a plain adjective. A predicative-adjective reading is possible in German, but dumling-wise the learner-facing meaning here still points most directly to the lexical verb and its result-state participle.",
	isVerified: true,
} as const;
