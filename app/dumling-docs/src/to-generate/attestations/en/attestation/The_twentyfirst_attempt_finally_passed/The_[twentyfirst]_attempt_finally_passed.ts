import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "twenty-first",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "en",
		normalizedSurface: "twenty-first",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The [twenty-first] attempt finally passed.",
	classifierNotes:
		"The hyphenated ordinal modifying a noun is ADJ with ordinal number features.",
} as const;
