import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Wegen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "wegen",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "wegen",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				governedCase: "Gen",
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
	sentenceMarkdown: "[Wegen] dem Regen kamen wir zu spät.",
	classifierNotes:
		"This is the normative genitive-governing adposition even though the complement phrase is colloquially dative.",
	classificationMistakes:
		"Reading belongs to a later layer; this Dumling Attestation only resolves the reviewed adposition `wegen`.",
} as const;
