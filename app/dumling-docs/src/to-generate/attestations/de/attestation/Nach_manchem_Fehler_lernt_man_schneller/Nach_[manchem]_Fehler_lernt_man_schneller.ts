import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "manchem",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "manchem",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			gender: "Masc",
			number: "Sing",
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
		lemma: {
			language: "de",
			canonicalForm: "manch",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				pronType: "Ind",
				definite: null,
				extPos: null,
				foreign: null,
				numType: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Nach [manchem] Fehler lernt man schneller.",
	classifierNotes:
		"Manchem is annotated as DET because it modifies Fehler; it would be PRON only in substantive use.",
	isVerified: true,
} as const;
