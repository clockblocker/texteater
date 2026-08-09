import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "er",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "er",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Masc",
			number: "Sing",
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "er",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "3",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Sieh einmal, hier steht [er], \npfui, der Struwwelpeter!",
	classifierNotes: "",
	isVerified: true,
} as const;
