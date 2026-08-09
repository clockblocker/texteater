import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "muss",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "muss",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das [muss] heute noch raus.",
	classifierNotes:
		"Muss is treated as a lexical modal VERB with verbType Mod here, because it is the clause's main predicate and there is no overt infinitive for it to auxiliary-mark.",
	classificationMistakes:
		"Do not default finite müssen to AUX just because it is modal. In this attestation the earlier mistake was classifying muss as kind AUX even though the clause is elliptical and the selected word functions as the main predicate rather than as an auxiliary to an overt infinitive.",
	isVerified: true,
} as const;
