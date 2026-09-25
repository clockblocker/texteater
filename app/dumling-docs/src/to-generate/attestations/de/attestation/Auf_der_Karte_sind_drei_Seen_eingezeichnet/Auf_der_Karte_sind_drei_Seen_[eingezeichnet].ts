import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "eingezeichnet",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "eingezeichnet",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: null,
			degree: "Pos",
			gender: null,
			number: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "eingezeichnet",
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
	sentenceMarkdown: "Auf der Karte sind drei Seen [eingezeichnet].",
	classifierNotes:
		"sein plus eingezeichnet is a state passive: sind is the copula VERB and eingezeichnet the ADJ eingezeichnet with Participle Source einzeichnen (ADR 0035).",
	isVerified: true,
} as const;
