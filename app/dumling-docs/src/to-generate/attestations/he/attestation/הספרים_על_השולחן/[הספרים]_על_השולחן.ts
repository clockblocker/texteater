import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ה",
			orthography: "Fused",
			fusion: {
				spelling: "הספרים",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "ספרים", surface: "ספרים" },
				],
			},
			component: 0,
		},
		{
			attested: "ספרים",
			orthography: "Fused",
			fusion: {
				spelling: "הספרים",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "ספרים", surface: "ספרים" },
				],
			},
			component: 1,
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ספרים",
		spelling: "Canonical",

		inflectionalFeatures: {
			definite: "Def",
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "ספר",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[הספרים] על השולחן.",
	classifierNotes:
		"The definite plural noun owns its article: members are the Fused pieces ה and ספרים, and normalizedSurface is ספרים without the article.",
} as const;
