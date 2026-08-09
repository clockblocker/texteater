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
	sentenceMarkdown: "Er lief erst nach links und dann [hinaus].",
	classifierNotes:
		"Hinaus is a standalone directional adverb here. The sequence `nach links und dann hinaus` makes the path expression contrastive and compositional rather than forcing a separable-verb reading.",
	isVerified: true,
} as const;
