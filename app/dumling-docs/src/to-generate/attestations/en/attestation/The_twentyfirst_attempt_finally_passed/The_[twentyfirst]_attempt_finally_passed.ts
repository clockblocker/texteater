import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "twenty-first",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "twenty-first",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "twenty-first",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				numForm: "Word",
				numType: "Ord",
				abbr: null,
				extPos: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The [twenty-first] attempt finally passed.",
	classifierNotes:
		"The hyphenated ordinal modifying a noun is ADJ with ordinal number features.",
} as const;
