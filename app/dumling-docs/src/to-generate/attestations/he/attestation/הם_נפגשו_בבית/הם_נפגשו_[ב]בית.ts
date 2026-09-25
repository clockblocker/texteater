import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ב",
			orthography: "Fused",
			fusion: {
				spelling: "בבית",
				components: [
					{ span: "ב", surface: "ב" },
					{ span: "", surface: "ה" },
					{ span: "בית", surface: "בית" },
				],
			},
			component: 0,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ב",
		spelling: "Canonical",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "ב",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				abbr: null,
				case: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הם נפגשו [ב]בית.",
	classifierNotes:
		"ב is the ADP in, its own Lexeme and the Fused first piece of בבית (ba-bayit). The Fusion lists the hidden article ה between ב and בית; that component belongs to the noun בית.",
} as const;
