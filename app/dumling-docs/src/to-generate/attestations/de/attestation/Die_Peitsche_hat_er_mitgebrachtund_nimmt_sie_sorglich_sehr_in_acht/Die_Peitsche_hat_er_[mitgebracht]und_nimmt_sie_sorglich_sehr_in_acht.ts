import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "hat",
			orthography: "Standard",
		},
		{
			attested: "mitgebracht",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "hat mitgebracht",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			expletive: null,
			perfect: "Yes",
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "mitbringen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasSepPrefix: "mit",
				hasGovPrep: null,
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
		"Die Peitsche hat er [mitgebracht]\nund nimmt sie sorglich sehr in acht.",
	classifierNotes:
		"Hat and mitgebracht are the two fixed members of this perfect occurrence; the participle supplies Surface morphology and the prefix remains a Lemma feature.",
	isVerified: true,
} as const;
