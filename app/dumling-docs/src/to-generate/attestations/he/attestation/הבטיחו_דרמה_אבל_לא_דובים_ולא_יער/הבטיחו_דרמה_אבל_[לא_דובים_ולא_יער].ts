import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
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
			attested: "ולא",
			orthography: "Standard",
		},
		{
			attested: "יער",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: "לא דובים ולא יער",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: "לא דובים ולא יער",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "הבטיחו דרמה, אבל [לא דובים ולא יער].",
	classifierNotes:
		"לא דובים ולא יער is classified as an idiom; it is proverb-like, but used here as a fixed idiomatic denial.",
} as const;
