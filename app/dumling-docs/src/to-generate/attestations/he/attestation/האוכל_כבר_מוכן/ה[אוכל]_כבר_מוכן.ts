import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ה",
			orthography: "Fused",
			fusion: {
				spelling: "האוכל",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "אוכל", surface: "אוכל" },
				],
			},
			component: 0,
		},
		{
			attested: "אוכל",
			orthography: "Fused",
			fusion: {
				spelling: "האוכל",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "אוכל", surface: "אוכל" },
				],
			},
			component: 1,
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			definite: "Def",
			number: "Sing",
		},
		language: "he",
		normalizedSurface: "אוכל",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "אוכל",
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
	sentenceMarkdown: "ה[אוכל] כבר מוכן.",
	classifierNotes:
		"אוכל is the noun food here, separated from the future-verb homograph by lemma and POS. It owns the article ה, so the Surface records Def.",
} as const;
