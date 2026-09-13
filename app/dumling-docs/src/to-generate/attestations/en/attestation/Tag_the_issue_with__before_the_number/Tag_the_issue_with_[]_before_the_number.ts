import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "#",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "en",
		normalizedSurface: "#",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "number sign",
			family: "Lexeme",
			kind: "SYM",
			coreFeatures: {
				abbr: null,
				extPos: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "SYM">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Tag the issue with [#] before the number.",
	classifierNotes:
		"The symbol surface # points to a worded canonical lemma, number sign.",
} as const;
