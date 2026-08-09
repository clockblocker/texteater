import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Verletzter",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Verletzter",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Verletzter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Ein [Verletzter] lag am Straßenrand.",
	classifierNotes:
		"Verletzter is a substantivized participial form used as a noun here. The highlighted form is already citation-shaped for this nominal reading, so it stays `Surface/Citation` and is classified as `NOUN` rather than `ADJ` or `VERB`.",
	isVerified: true,
} as const;
