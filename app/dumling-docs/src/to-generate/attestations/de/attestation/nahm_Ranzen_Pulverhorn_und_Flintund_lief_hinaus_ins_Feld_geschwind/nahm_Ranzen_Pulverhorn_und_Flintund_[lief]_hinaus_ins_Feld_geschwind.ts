import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "lief",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "lief",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "laufen",
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
		"nahm Ranzen, Pulverhorn und Flint\nund [lief] hinaus ins Feld geschwind",
	classificationMistakes:
		"I previously inflated the selected finite verb into the separable verb `hinauslaufen`. With the directional-item rule tightened, the safer analysis here is the ordinary finite verb `laufen`, while `hinaus` is handled separately as an adverb.",
	classifierNotes:
		"The attested member is analyzed as the plain finite verb `lief` from lemma `laufen`. The following `hinaus` is treated separately as a directional adverb rather than being folded into a larger separable-verb payload here.",
	isVerified: true,
} as const;
