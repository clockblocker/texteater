import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "the",
			orthography: "Standard",
		},
		{
			attested: "early",
			orthography: "Standard",
		},
		{
			attested: "bird",
			orthography: "Standard",
		},
		{
			attested: "catches",
			orthography: "Standard",
		},
		{
			attested: "the",
			orthography: "Standard",
		},
		{
			attested: "worm",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "the early bird catches the worm",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "the early bird catches the worm",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Remember, the [early bird] catches the worm.",
	classifierNotes:
		"The Full Attestation records every member of the proverb occurrence; the docs review span remains on the salient fragment early bird.",
} as const;
