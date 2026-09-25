import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "על",
			orthography: "Standard",
		},
		{
			attested: "ה",
			orthography: "Fused",
			fusion: {
				spelling: "הפנים",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "פנים", surface: "פנים" },
				],
			},
			component: 0,
		},
		{
			attested: "פנים",
			orthography: "Fused",
			fusion: {
				spelling: "הפנים",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "פנים", surface: "פנים" },
				],
			},
			component: 1,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "על הפנים",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "על הפנים",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הראיון היה על ה[פנים].",
	classifierNotes:
		"The idiom על הפנים owns every piece of its occurrence, including ה and פנים, the Fused pieces of הפנים. The review span on פנים does not make it a noun Attestation.",
} as const;
