import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "linke",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "linke",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Fem",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "links",
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
	sentenceMarkdown: "Die [linke] Hand zitterte.",
	classifierNotes:
		"This is ordinary adjective agreement, included to contrast the directional adjective with political and proper-noun readings.",
	isVerified: true,
} as const;
