import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "und",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "und",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "und",
			family: "Lexeme",
			kind: "CCONJ",
			coreFeatures: {
				conjType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "CCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die Peitsche hat er mitgebracht\n[und] nimmt sie sorglich sehr in acht.",
	classifierNotes: "",
	isVerified: true,
} as const;
