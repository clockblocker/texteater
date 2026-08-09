import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "That",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "that",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "that",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Dem",
				abbr: null,
				extPos: null,
				person: null,
				poss: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[That] was unexpected.",
	classifierNotes:
		"Standalone that is PRON; it shares its surface spelling with the DET and SCONJ examples.",
} as const;
