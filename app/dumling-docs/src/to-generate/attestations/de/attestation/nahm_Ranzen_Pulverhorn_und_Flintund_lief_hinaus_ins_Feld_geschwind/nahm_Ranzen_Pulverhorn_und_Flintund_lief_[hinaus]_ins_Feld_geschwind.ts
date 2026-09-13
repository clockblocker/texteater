import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "hinaus",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "hinaus",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "hinaus",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"nahm Ranzen, Pulverhorn und Flint\nund lief [hinaus] ins Feld geschwind",
	classificationMistakes:
		"I previously forced `hinaus` into the separable verb `hinauslaufen`. Under the stricter directional-item rule, this sentence is better analyzed as plain `laufen` plus the standalone directional adverb `hinaus`, because nothing in the form itself disambiguates toward the lexicalized verb.",
	classifierNotes:
		"Hinaus is treated as the standalone directional adverb here. In an ambiguous motion clause like `lief hinaus`, dumling now leans toward `Verb + directional adverb` unless the form itself or stronger context clearly forces a separable-verb analysis.",
	isVerified: true,
} as const;
