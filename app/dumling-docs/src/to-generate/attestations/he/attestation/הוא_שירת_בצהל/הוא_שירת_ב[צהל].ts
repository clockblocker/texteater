import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: 'צה"ל',
			orthography: "Fused",
			fusion: {
				spelling: 'בצה"ל',
				components: [
					{ span: "ב", surface: "ב" },
					{ span: 'צה"ל', surface: 'צה"ל' },
				],
			},
			component: 1,
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "he",
		normalizedSurface: 'צה"ל',
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: 'צה"ל',
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				abbr: "Yes",
				article: null,
				gender: "Masc",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: 'הוא שירת ב[צה"ל].',
	classifierNotes:
		'צה"ל is an abbreviated proper noun with the quote mark retained and abbr Yes.',
} as const;
