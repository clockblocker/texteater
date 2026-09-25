import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "manchem",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "manchem",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "manchem",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: "Dat",
				gender: "Masc",
				number: "Sing",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "DET">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Nach [manchem] Fehler lernt man schneller.",
	classifierNotes:
		"Manchem is annotated as DET because it modifies Fehler; it would be PRON only in substantive use.",
	isVerified: true,
} as const;
