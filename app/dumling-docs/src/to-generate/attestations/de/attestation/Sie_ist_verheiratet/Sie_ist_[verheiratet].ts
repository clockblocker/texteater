import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "verheiratet",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "verheiratet",
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
			canonicalForm: "verheiratet",
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
	sentenceMarkdown: "Sie ist [verheiratet].",
	classifierNotes:
		"Verheiratet expresses an established personal property rather than a productive passive event. Under the TIGER boundary in ADR 0007, it is the participial adjective verheiratet/ADJ and the copula stays separate.",
	isVerified: true,
} as const;
