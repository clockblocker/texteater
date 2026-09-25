import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Die",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "die",
		spelling: "Canonical",
		inflectionalFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "die",
			family: "Lexeme",
			kind: "DET",
			coreFeatures: {
				case: "Acc",
				gender: "Fem",
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
	sentenceMarkdown:
		"[Die] Peitsche hat er mitgebracht\nund nimmt sie sorglich sehr in acht.",
	classifierNotes:
		"Sentence-initial Die is the definite article, not a pronoun. Die Peitsche is the fronted accusative object of hat mitgebracht, with er as subject, so the Lemma is the accusative feminine singular article cell die.",
	classificationMistakes:
		"Do not mark ordinary sentence-initial capitalization as a spelling variant. `Die` is a Standard click on a Canonical Surface.",
	isVerified: true,
} as const;
