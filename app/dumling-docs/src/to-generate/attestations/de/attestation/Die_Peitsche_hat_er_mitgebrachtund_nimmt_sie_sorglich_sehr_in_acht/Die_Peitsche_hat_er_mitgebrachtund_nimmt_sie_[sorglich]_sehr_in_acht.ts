import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "sorglich",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "sorglich",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "sorglich",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die Peitsche hat er mitgebracht\nund nimmt sie [sorglich] sehr in acht.",
	classifierNotes:
		"Sorglich is a manner adverb here, even though the form can feel adjective-like in modern German because it is rare outside literary style.",
	isVerified: true,
} as const;
