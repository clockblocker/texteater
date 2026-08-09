import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Viele",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "viele",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
			gender: null,
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "viel",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Ind",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Viele] kamen zu spät.",
	classifierNotes:
		"Viele is annotated as PRON because it stands substantively for a plural group with no overt noun head. In attributive use, as in viele Leute, the same lexical item would be DET instead.",
	isVerified: true,
} as const;
