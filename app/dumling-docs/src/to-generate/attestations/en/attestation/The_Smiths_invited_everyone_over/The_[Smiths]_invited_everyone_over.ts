import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Smiths",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "Smiths",
		spelling: "Canonical",

		inflectionalFeatures: {
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The [Smiths] invited everyone over.",
	classifierNotes:
		"Family-name plural is PROPN with inflectional number rather than a common noun.",
} as const;
