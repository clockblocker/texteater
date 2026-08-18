import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "um",
			orthography: "Standard",
		},
		{
			attested: "zu",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "um zu",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "um zu",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: { conjType: null },
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Ich gehe Tomaten kaufen, um einen Salat [zu] machen.",
	classifierNotes:
		"The Full Attestation records both ordered members of the multi-member Lexeme/SCONJ `um zu`; the docs-owned review span remains on `zu`, outside the Dumling DTO.",
} as const;
