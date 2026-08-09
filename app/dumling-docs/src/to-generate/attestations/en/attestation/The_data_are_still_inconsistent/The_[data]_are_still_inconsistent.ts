import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "data",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "data",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
		},
		lemma: {
			language: "en",
			canonicalForm: "datum",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The [data] are still inconsistent.",
	classifierNotes:
		"Data is treated as a plural inflection of datum, even though contemporary usage often treats data as mass or singular.",
} as const;
