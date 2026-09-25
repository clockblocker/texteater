import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "The",
			orthography: "Standard",
		},
		{
			attested: "saw",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			article: "Definite",
			number: "Sing",
		},
		language: "en",
		normalizedSurface: "saw",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "saw",
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
	sentenceMarkdown: "The [saw] needs a new blade.",
	classifierNotes:
		"Tool saw is a noun citation surface; the model can keep it distinct from the verb surface saw.",
} as const;
