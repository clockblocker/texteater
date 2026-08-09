import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "better",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "better",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			degree: "Cmp",
		},
		lemma: {
			language: "en",
			canonicalForm: "good",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				extPos: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "This is the [better] option.",
	classifierNotes:
		"Irregular comparative better is attached to the Lemma good with Degree=Cmp.",
} as const;
