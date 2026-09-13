import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ward",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "ward",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "werden",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Jetzt schien die Sonne gar zu sehr,\nda [ward] ihm sein Gewehr zu schwer.",
	classifierNotes:
		"I treated `ward` as the archaic 3sg past finite of `werden` and analyzed it as `VERB` because it carries the clause's change-of-state meaning with the predicative complement `zu schwer`, rather than auxiliary-marking another verbal form. We may eventually want an `isArch` flag on `Attestation` for forms like `ward`, but for now this attestation stays otherwise unchanged.",
	classificationMistakes:
		"Do not default finite `werden` to `AUX` just because it takes a predicative complement. The earlier mistake here was classifying `ward` as `AUX` instead of lexical `VERB` in a change-of-state use.",
	isVerified: true,
} as const;
