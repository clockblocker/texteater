import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "reisende",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	governedPrepositionEvidence: null,
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "reisende",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: null,
			number: "Sing",
			person: null,
			tense: null,
			verbForm: "Part",
			participleForm: "Present",
			case: "Nom",
			gender: "Masc",
			degree: null,
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "reisen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
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
	sentenceMarkdown: "Der [reisende] Händler wartete draußen.",
	classifierNotes:
		"Reisende is a productive attributive Partizip I of reisen, so it resolves to the verb (ADR 0033) and carries Nom Sing Masc agreement. The substantivized der Reisende is a NOUN.",
	isVerified: true,
} as const;
