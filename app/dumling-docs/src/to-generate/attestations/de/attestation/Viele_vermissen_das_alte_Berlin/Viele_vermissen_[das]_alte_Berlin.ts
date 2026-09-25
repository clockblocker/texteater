import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "das",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "das",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "das",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: "Acc",
				gender: "Neut",
				number: "Sing",
				definite: "Def",
				pronType: "Art",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Viele vermissen [das] alte Berlin.",
	classifierNotes:
		"Berlin is a name cited bare, so it owns no article: das is the definite article the phrase takes here, and it stays its own DET.",
	isVerified: true,
} as const;
