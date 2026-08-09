import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "an",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "an",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "an",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				abbr: null,
				extPos: null,
				foreign: null,
				governedCase: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Einst ging er [an] Ufers Rand\nmit der Mappe in der Hand.",
	classifierNotes:
		"`an` is the ordinary two-way preposition. I left `governedCase` unset because this schema only accepts one value there, while the lexeme alternates between accusative and dative and the local context is not decisive enough to hard-code one on the Lemma itself.",
	isVerified: true,
} as const;
