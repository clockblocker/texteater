import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ה",
			orthography: "Fused",
			fusion: {
				spelling: "הבית",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "בית", surface: "בית" },
				],
			},
			component: 0,
		},
		{
			attested: "בית",
			orthography: "Fused",
			fusion: {
				spelling: "הבית",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "בית", surface: "בית" },
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
		normalizedSurface: "בית",
		spelling: "Canonical",
		inflectionalFeatures: {
			definite: "Def",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "בית",
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
	sentenceMarkdown: "[ה]בית פתוח.",
	classifierNotes:
		"The article ה is owned by its noun: clicking it opens בית (Def), whose members are the Fused pieces ה and בית. normalizedSurface is the noun's own letters.",
} as const;
