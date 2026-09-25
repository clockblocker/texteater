import type * as Dumling from "dumling/types";

const occurrenceAttestation: Dumling.Attestation<"de", "Lexeme", "PRON"> = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Viele",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "viele",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "viele",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Ind",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
				case: "Nom",
				number: "Plur",
				gender: null,
			},
		},
		surfaceFeatures: null,
	},
};

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Viele] kamen zu spät.",
	classifierNotes:
		"Viele is annotated as PRON because it stands substantively for a plural group with no overt noun head. In attributive use, as in viele Leute, the same lexical item would be DET instead.",
	isVerified: true,
} as const;
