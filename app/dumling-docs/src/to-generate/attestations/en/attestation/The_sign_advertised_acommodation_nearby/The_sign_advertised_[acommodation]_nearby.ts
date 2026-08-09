import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "acommodation",
			orthography: "Typo",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "accommodation",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "accommodation",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The sign advertised [acommodation] nearby.",
	classifierNotes:
		"Acommodation is represented as Typo with normalized surface accommodation; no edit-distance metadata exists.",
} as const;
