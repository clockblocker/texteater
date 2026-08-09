import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "hinaus",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "hinaus",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"de", "Citation", "Lexeme", "ADV">;

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
