import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "לא",
			orthography: "Standard",
		},
		{
			attested: "דובים",
			orthography: "Standard",
		},
		{
			attested: "ו",
			orthography: "Fused",
			fusion: {
				spelling: "ולא",
				components: [
					{ span: "ו", surface: "ו" },
					{ span: "לא", surface: "לא" },
				],
			},
			component: 0,
		},
		{
			attested: "לא",
			orthography: "Fused",
			fusion: {
				spelling: "ולא",
				components: [
					{ span: "ו", surface: "ו" },
					{ span: "לא", surface: "לא" },
				],
			},
			component: 1,
		},
		{
			attested: "יער",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "לא דובים ולא יער",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "לא דובים ולא יער",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הבטיחו דרמה, אבל [לא דובים ולא יער].",
	classifierNotes:
		"לא דובים ולא יער is classified as an idiom; it is proverb-like, but used here as a fixed idiomatic denial.",
} as const;
