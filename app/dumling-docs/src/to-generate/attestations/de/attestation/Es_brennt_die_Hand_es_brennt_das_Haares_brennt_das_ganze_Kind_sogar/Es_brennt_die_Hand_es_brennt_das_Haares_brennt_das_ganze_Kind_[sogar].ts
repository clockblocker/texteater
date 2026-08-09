import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "sogar",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "sogar",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "sogar",
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
		"Es brennt die Hand, es brennt das Haar,\nes brennt das ganze Kind [sogar].",
	classifierNotes:
		"Sogar is the scalar focus item here. The current dumling inventory does not give German focus particles a dedicated subtype, so I classified it as ADV rather than inventing a particle-specific analysis.",
	isVerified: true,
} as const;
