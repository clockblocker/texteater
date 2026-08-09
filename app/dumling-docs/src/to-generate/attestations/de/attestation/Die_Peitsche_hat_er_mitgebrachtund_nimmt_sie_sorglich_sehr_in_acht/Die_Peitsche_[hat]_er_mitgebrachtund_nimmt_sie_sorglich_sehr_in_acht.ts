import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "hat",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "hat",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "haben",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die Peitsche [hat] er mitgebracht\nund nimmt sie sorglich sehr in acht.",
	classifierNotes:
		"Hat is the present finite auxiliary in the perfect construction hat mitgebracht, not a lexical possession verb here.",
	isVerified: true,
} as const;
