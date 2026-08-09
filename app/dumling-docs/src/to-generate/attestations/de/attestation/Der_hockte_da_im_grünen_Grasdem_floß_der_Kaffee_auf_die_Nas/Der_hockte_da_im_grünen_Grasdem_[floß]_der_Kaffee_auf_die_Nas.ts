import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "floß",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "floß",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "fließen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Der hockte da im grünen Gras;\ndem [floß] der Kaffee auf die Nas.",
	classifierNotes:
		"I read `floß` as the 3sg past finite of `fließen`: `dem floß der Kaffee auf die Nas` means the coffee ran onto his nose. I considered the noun `Floß` for a second because the isolated form is ambiguous, but the clause structure with dative experiencer `dem` and subject `der Kaffee` makes the verbal reading clearly better.",
	isVerified: true,
} as const;
