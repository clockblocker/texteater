import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "nächsten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "nächsten",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Dat",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "nächst",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Am [nächsten] Morgen war alles anders.",
	classifierNotes:
		"Nächsten is treated here as an inflected form of the lexical adjective nächst in its temporal 'next/upcoming' use, not as the superlative of nah.",
	classificationMistakes:
		"Do not force this row under lemma nah with degree Sup just because nächsten is historically related to nah. In this attestation the learner-facing meaning is temporal 'next', so the earlier mistakes were using canonicalLemma nah, degree Sup, and a proximity-style emoji instead of modeling lexical nächst directly.",
	isVerified: true,
} as const;
