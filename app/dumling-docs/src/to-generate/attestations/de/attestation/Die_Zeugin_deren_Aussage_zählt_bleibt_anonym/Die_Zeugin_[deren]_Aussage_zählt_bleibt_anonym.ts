import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "deren",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "deren",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "deren",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Rel",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
				case: "Gen",
				number: "Sing",
				gender: "Fem",
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die Zeugin, [deren] Aussage zählt, bleibt anonym.",
	classifierNotes:
		"Deren is the feminine genitive singular counterpart to dessen in this context.",
	isVerified: true,
} as const;
