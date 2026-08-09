import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Mutter",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Mutter",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Mutter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Fem",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Meine [Mutter] ruft jeden Sonntag an.",
	classifierNotes: "This is the kinship noun Mutter.",
	isVerified: true,
} as const;
