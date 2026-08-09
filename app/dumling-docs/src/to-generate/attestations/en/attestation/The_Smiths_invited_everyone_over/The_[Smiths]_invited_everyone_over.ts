import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Smiths",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "Smiths",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
		},
		lemma: {
			language: "en",
			canonicalForm: "Smith",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Inflection", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The [Smiths] invited everyone over.",
	classifierNotes:
		"Family-name plural is PROPN with inflectional number rather than a common noun.",
} as const;
