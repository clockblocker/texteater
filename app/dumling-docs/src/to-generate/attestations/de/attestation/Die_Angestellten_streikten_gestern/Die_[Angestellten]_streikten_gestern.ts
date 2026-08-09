import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Angestellten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Angestellten",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalForm: "Angestellter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die [Angestellten] streikten gestern.",
	classifierNotes:
		"Angestellten is a substantivized participial form used here as a plural noun. Under the German rule for nominalized verb forms, it classifies as NOUN rather than ADJ or VERB; subject position and verb agreement support nominative plural.",
	isVerified: true,
} as const;
