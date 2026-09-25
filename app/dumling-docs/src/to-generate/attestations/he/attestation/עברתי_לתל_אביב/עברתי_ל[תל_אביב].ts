import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "תל",
			orthography: "Fused",
			fusion: {
				spelling: "לתל",
				components: [
					{ span: "ל", surface: "ל" },
					{ span: "תל", surface: "תל" },
				],
			},
			component: 1,
		},
		{
			attested: "אביב",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "he",
		normalizedSurface: "תל אביב",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "תל אביב",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Fem",
				abbr: null,
				article: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "עברתי ל[תל אביב].",
	classifierNotes:
		"תל אביב is a multiword proper-noun citation with no additional inflectional surface features.",
} as const;
