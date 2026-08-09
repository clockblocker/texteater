import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "geschwind",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "geschwind",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "geschwind",
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
		"nahm Ranzen, Pulverhorn und Flint\nund lief hinaus ins Feld [geschwind]",
	classifierNotes:
		"I treated `geschwind` here as an adverb meaning `quickly`, not as an adjective, because it modifies the running event directly and shows no adjectival inflection in this use.",
	isVerified: true,
} as const;
