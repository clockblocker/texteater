import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: 'צה"ל',
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "he",
		normalizedSurface: 'צה"ל',
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalForm: 'צה"ל',
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				abbr: "Yes",
				gender: "Masc",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"he", "Citation", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: 'הוא שירת ב[צה"ל].',
	classifierNotes:
		'צה"ל is an abbreviated proper noun with the quote mark retained and abbr Yes.',
} as const;
