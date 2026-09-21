import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "erinnert",
			orthography: "Standard",
		},
		{
			attested: "sich",
			orthography: "Standard",
		},
		{
			attested: "an",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "erinnert sich an",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "sich erinnern",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				lexicallyReflexive: "Yes",
				hasGovPrep: "an",
				hasSepPrefix: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Sie [erinnert] sich an den Geruch.",
	classifierNotes:
		"The inherently reflexive sich and governed an are fixed occurrence members; the Lemma identity remains sich erinnern with the same core features.",
	isVerified: true,
} as const;
