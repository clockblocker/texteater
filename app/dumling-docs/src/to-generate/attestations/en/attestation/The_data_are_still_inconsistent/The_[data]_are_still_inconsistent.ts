import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "The",
			orthography: "Standard",
		},
		{
			attested: "data",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "data",
		spelling: "Canonical",

		inflectionalFeatures: {
			article: "Definite",
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The [data] are still inconsistent.",
	classifierNotes:
		"Data is treated as a plural inflection of datum, even though contemporary usage often treats data as mass or singular.",
} as const;
