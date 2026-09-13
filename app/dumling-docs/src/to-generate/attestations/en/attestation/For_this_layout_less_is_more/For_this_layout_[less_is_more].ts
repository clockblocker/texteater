import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "less",
			orthography: "Standard",
		},
		{
			attested: "is",
			orthography: "Standard",
		},
		{
			attested: "more",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "less is more",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "less is more",
			family: "Phraseme",
			kind: "Aphorism",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Phraseme", "Aphorism">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "For this layout, [less is more].",
	classifierNotes:
		"Less is more is treated as an aphorism rather than a proverb because it states a maxim without narrative proverb form.",
} as const;
