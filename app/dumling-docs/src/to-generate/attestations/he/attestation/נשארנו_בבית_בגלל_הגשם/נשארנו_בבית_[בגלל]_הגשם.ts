import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "בגלל",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "בגלל",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "בגלל",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				abbr: null,
				case: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "נשארנו בבית [בגלל] הגשם.",
	classifierNotes:
		"בגלל is a causal adposition without an additional case feature in the current schema.",
} as const;
