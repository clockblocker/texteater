import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "best",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "best",
		spelling: "Canonical",

		inflectionalFeatures: {
			degree: "Sup",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "She performed [best] under pressure.",
	classifierNotes:
		"Best is modeled as a superlative adverb here, not an adjective, because it modifies performed.",
} as const;
