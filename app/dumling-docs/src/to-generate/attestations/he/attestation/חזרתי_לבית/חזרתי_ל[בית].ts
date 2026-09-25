import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "בית",
			orthography: "Fused",
			fusion: {
				spelling: "לבית",
				components: [
					{ span: "ל", surface: "ל" },
					{ span: "", surface: "ה" },
					{ span: "בית", surface: "בית" },
				],
			},
			component: 2,
		},
	],
	realizationCoverage: "Partial",
	articleEvidence: {
		kind: "Hidden",
		fusion: {
			spelling: "לבית",
			components: [
				{ span: "ל", surface: "ל" },
				{ span: "", surface: "ה" },
				{ span: "בית", surface: "בית" },
			],
		},
		component: 1,
	},
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
	sentenceMarkdown: "חזרתי ל[בית].",
	classifierNotes:
		"לבית is la-bayit: ל, a hidden article ה with no letters of its own, and בית. The noun owns that hidden component, so it records Def and its coverage is Partial, pointing at component 1 of the Fusion.",
} as const;
