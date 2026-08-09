import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "spilled",
			orthography: "Standard",
		},
		{
			attested: "the",
			orthography: "Standard",
		},
		{
			attested: "beans",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "spilled the beans",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "spill the beans",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Mira finally [spilled] the beans.",
	classifierNotes:
		"The Full Attestation records spilled, the, and beans as the complete idiom occurrence; the docs review span remains on spilled only.",
} as const;
