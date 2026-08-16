import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "ungelöst",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "ungelöst",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: null,
			degree: "Pos",
			gender: null,
			number: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "ungelöst",
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die Aufgabe bleibt [ungelöst].",
	classifierNotes:
		"Bleibt plus un- formation supplies adjective diagnostics. Under the TIGER boundary in ADR 0007, ungelöst is a participial adjective and bleibt remains a separate copula.",
	isVerified: true,
} as const;
