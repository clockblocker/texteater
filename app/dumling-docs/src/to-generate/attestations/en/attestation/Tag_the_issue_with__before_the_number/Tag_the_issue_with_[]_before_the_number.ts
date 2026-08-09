import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "#",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "#",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"en", "Citation", "Lexeme", "SYM">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Tag the issue with [#] before the number.",
	classifierNotes:
		"The symbol surface # points to a worded canonical lemma, number sign.",
} as const;
