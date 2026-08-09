import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "like",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "like",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "like",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: {
				style: "Vrnc",
				abbr: null,
				extPos: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Do it [like] I showed you.",
	classifierNotes:
		"Like as a subordinator is marked SCONJ with vernacular style because many registers prefer as.",
} as const;
