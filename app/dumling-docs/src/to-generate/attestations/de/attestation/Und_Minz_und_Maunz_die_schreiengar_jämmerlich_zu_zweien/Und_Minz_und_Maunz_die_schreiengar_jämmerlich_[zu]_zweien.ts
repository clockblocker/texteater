import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "zu",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "zu",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "zu",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				governedCase: "Dat",
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
	sentenceMarkdown:
		"Und Minz und Maunz, die schreien\ngar jämmerlich [zu] zweien",
	classifierNotes:
		"Here zu is the preposition heading the fixed adverbial phrase zu zweien, so I kept it as ADP rather than reading it as infinitival or separable-particle zu.",
	isVerified: true,
} as const;
