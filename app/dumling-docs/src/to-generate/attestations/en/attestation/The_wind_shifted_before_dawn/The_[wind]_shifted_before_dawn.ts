import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "The",
			orthography: "Standard",
		},
		{
			attested: "wind",
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
		normalizedSurface: "wind",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "wind",
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
	sentenceMarkdown: "The [wind] shifted before dawn.",
	classifierNotes:
		"Wind as weather is a noun citation surface sharing spelling with the verb wind.",
} as const;
