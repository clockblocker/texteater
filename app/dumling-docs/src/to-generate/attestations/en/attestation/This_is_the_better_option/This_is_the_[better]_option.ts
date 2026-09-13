import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "better",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "better",
		spelling: "Canonical",

		inflectionalFeatures: {
			degree: "Cmp",
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "This is the [better] option.",
	classifierNotes:
		"Irregular comparative better is attached to the Lemma good with Degree=Cmp.",
} as const;
