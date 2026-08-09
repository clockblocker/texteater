import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "wind",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "wind",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "wind",
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
	sentenceMarkdown: "The [wind] shifted before dawn.",
	classifierNotes:
		"Wind as weather is a noun citation surface sharing spelling with the verb wind.",
} as const;
