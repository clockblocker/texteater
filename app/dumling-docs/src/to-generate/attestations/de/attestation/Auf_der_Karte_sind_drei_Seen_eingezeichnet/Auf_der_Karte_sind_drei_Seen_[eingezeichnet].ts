import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "eingezeichnet",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "eingezeichnet",
		spelling: "Canonical",

		inflectionalFeatures: {
			participleForm: "Past",
			verbForm: "Part",
			mood: null,
			number: null,
			person: null,
			tense: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "einzeichnen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "ein",
				hasGovPrep: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Auf der Karte sind drei Seen [eingezeichnet].",
	classifierNotes:
		"Eingezeichnet is treated as the perfect participle of separable einzeichnen. Under the current German rule, attributive participles like eingezeichneten in die eingezeichneten Seen go to ADJ, but this bare predicative Partizip-II form stays VERB despite the result-state reading.",
	isVerified: true,
} as const;
