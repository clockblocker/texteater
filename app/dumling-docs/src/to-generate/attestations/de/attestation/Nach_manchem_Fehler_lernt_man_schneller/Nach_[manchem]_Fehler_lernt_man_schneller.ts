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
		inflectionalFeatures: {
			case: "Dat",
			gender: "Masc",
			number: "Sing",
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "mancher",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: null,
				gender: null,
				number: null,
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
