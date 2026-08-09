import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "anders",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "anders",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "anders",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Am nächsten Morgen war alles [anders].",
	classifierNotes:
		"Anders is treated as a citation-shaped adjective in predicative use because it is the complement of sein and predicates over alles, not over the event. Even though it can feel adverb-like in English glossing, dumling's German patterns classify comparable predicative forms like tot and entzwei as ADJ rather than ADV.",
	isVerified: true,
} as const;
