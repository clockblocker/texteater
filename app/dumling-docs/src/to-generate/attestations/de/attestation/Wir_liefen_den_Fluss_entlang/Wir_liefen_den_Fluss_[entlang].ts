import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "entlang",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "entlang",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "entlang",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Post",
				governedCase: "Acc",
				abbr: null,
				extPos: null,
				foreign: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Wir liefen den Fluss [entlang].",
	classifierNotes:
		"Entlang is treated as a postposition rather than an adverb because of its syntactic relation to den Fluss.",
	isVerified: true,
} as const;
