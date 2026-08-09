import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "einmal",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "einmal",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "einmal",
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
		"Sieh [einmal], hier steht er, \npfui, der Struwwelpeter!",
	classifierNotes:
		"I treated einmal here as an adverb rather than as part of a larger fixed expression with Sieh; in this line it functions like a discourse-softening or temporal adverbial token.",
} as const;
