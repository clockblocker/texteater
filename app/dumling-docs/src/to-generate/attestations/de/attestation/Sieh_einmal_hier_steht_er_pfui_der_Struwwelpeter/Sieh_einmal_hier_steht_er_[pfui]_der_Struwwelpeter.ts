import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "pfui",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "pfui",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "pfui",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Sieh einmal, hier steht er, \n[pfui], der Struwwelpeter!",
	classifierNotes:
		"Pfui is treated as a plain interjection. I did not force `partType: Res` because this use expresses disgust/exclamation, not the schema's narrower response-particle reading.",
	isVerified: true,
} as const;
