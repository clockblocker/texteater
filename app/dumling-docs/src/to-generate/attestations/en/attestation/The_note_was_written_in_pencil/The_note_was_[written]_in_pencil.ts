import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "written",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "written",
		spelling: "Canonical",

		inflectionalFeatures: {
			verbForm: "Part",
			voice: "Pass",
			mood: null,
			number: null,
			person: null,
			tense: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "write",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				phrasal: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The note was [written] in pencil.",
	classifierNotes:
		"Voice=Pass is context-sensitive for English participles; it is included to test whether the model accepts contextual morphology.",
} as const;
