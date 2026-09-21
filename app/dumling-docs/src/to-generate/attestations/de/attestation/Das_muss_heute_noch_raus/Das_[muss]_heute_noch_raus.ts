import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "muss",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "muss",
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
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "müssen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				verbType: "Mod",
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das [muss] heute noch raus.",
	classifierNotes:
		"Muss is treated as a lexical modal VERB with verbType Mod here, because it is the clause's main predicate and there is no overt infinitive for it to auxiliary-mark.",
	classificationMistakes:
		"Do not default finite müssen to AUX just because it is modal. In this attestation the earlier mistake was classifying muss as kind AUX even though the clause is elliptical and the selected word functions as the main predicate rather than as an auxiliary to an overt infinitive.",
	isVerified: true,
} as const;
