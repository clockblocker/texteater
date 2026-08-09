import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "e-mail",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "e-mail",
		spelling: "Variant",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "email",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Send the [e-mail] before noon.",
	classifierNotes:
		"Hyphenated e-mail is a standard variant of email, not a typo.",
} as const;
