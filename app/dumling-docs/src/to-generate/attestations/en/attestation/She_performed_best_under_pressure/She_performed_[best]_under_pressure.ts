import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "best",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "best",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			degree: "Sup",
		},
		lemma: {
			language: "en",
			canonicalForm: "well",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				abbr: null,
				extPos: null,
				numForm: null,
				numType: null,
				pronType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Inflection", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "She performed [best] under pressure.",
	classifierNotes:
		"Best is modeled as a superlative adverb here, not an adjective, because it modifies performed.",
} as const;
